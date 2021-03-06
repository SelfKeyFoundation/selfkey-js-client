/* global XMLHttpRequest */
'use strict';
const tpl = require('./templates');
const closeSvg = require('./images/close.svg');

var MSG_SRC = 'browser_lib';
var CONTENT_SRC = 'content';
var CONTENT_REQ_TIMEOUT = 5000;

var STATUSES = {
	READY: 0,
	INITIALIZING: 1,
	INITIALIZED: 2,
	TEARING_DOWN: 3,
	ERROR: 4
};

var defaultExtensionId = 'fmmadhehohahcpnjjkbdajimilceilcd';

var lws = {
	msgId: 0,
	status: STATUSES.READY,
	reqs: {}
};

var fmtMessage = (msg, req) => {
	req = req || {};
	msg.type = msg.type || req.type;
	msg.meta = msg.meta || {};
	let id = msg.meta.id;
	if (!id && req.meta && req.meta.id) {
		id = req.meta.id;
	}
	msg.meta.id = id || MSG_SRC + '_' + lws.msgId++;
	msg.meta.src = msg.meta.src || MSG_SRC;
	if (!msg.type && msg.error) {
		msg.error = true;
		msg.payload = {
			type: 'unknown',
			message: 'Unknown error'
		};
	}
	return msg;
};

lws.init = function initLWS(config) {
	if (lws.status !== STATUSES.READY) throw new Error('LWS can be initialized only once');
	lws.status = STATUSES.INITIALIZING;
	lws.config = config;
	lws.config.endpoints = lws.config.endpoints || {};
	initDomElements(config);
	window.addEventListener('message', handleContentMessage);
	sendToContent(
		{
			type: 'wp_init',
			payload: {
				website: config.website,
				rootEndpoint: config.rootEndpoint,
				endpoints: config.endpoints,
				attributes: config.attributes,
				did: config.did || false,
				meta: config.meta
			}
		},
		{},
		function initCb(err, res) {
			if (err) {
				console.error(err);
				lws.status = STATUSES.ERROR;
				lws.initError = err;
				return;
			}
			lws.status = STATUSES.INITIALIZED;
			lws.extConfig = res.payload;
		}
	);
};

lws.initFromContent = function initFromContent() {
	if (![STATUSES.INITIALIZED, STATUSES.ERROR].includes(lws.status)) {
		return;
	}
	sendToContent(
		{
			type: 'wp_init',
			payload: {
				website: lws.config.website,
				rootEndpoint: lws.config.rootEndpoint,
				endpoints: lws.config.endpoints,
				attributes: lws.config.attributes,
				meta: lws.config.meta,
				did: lws.config.did || false
			}
		},
		{},
		function initCb(err, res) {
			if (err) {
				console.error(err);
				lws.status = STATUSES.ERROR;
				lws.initError = err;
				return;
			}
			lws.status = STATUSES.INITIALIZED;
			lws.extConfig = res.payload;
			if (lws.activeComponent) {
				lws.activeComponent.reinitUI();
			}
		}
	);
};

lws.disconnectFromContent = function disconnectFromContent() {
	if (lws.status !== STATUSES.INITIALIZED) {
		return;
	}
	lws.status = STATUSES.ERROR;
	setTimeout(function() {
		if (lws.status !== STATUSES.ERROR) {
			return;
		}
		if (lws.activeComponent) {
			lws.activeComponent.reinitUI();
		}
	}, 1000);
};

lws.disconnectFromWallet = function disconnectFromWallet() {
	if (lws.activeComponent) {
		lws.activeComponent.reinitUI();
	}
};

lws.teardown = function initLWS() {
	teardownDomElements();
	sendToContent({ type: 'wp_teardown' });
	lws.initError = null;
	lws.status = STATUSES.READY;
	lws.extConfig = null;
	lws.config = null;
};

function handleContentMessage(evt) {
	var msg = evt.data;
	if (window !== evt.source) return;
	if (!msg || !msg.type || !msg.meta || msg.meta.src !== CONTENT_SRC) return;
	console.log('client: msg from content', msg);
	if (msg.type === 'content_init') {
		return lws.initFromContent();
	}
	if (msg.type === 'content_disconnect') {
		return lws.disconnectFromContent();
	}
	if (msg.type === 'idw_disconnect') {
		return lws.disconnectFromWallet();
	}
	if (msg.meta.id && lws.reqs[msg.meta.id]) {
		return lws.reqs[msg.meta.id].handleRes(msg);
	}
	if (msg.type === 'wp_auth') {
		if (lws.config && typeof lws.config.onAuthResponse === 'function') {
			if (msg.error) {
				return lws.config.onAuthResponse(msg.payload, null, lws.activeComponent);
			}
			return lws.config.onAuthResponse(null, msg.payload, lws.activeComponent);
		}
		if (msg.error) {
			console.error('lws-sdk:', msg.payload);
			return;
		}
		if (msg.payload.token || msg.payload.jwt) {
			var request = new XMLHttpRequest();
			var body = JSON.stringify(msg.payload);
			let loginUrl = lws.config.endpoints.login || lws.config.rootEndpoint + '/login';
			if (!loginUrl.match(/^https?:/)) {
				let websiteUrl = lws.config.website.url;
				if (loginUrl.startsWith('/')) loginUrl = loginUrl.substr(1);
				if (websiteUrl.endsWith('/'))
					websiteUrl = websiteUrl.substr(0, websiteUrl.length - 1);
				loginUrl = `${websiteUrl}/${loginUrl}`;
			}
			request.open('POST', loginUrl, true);
			request.onreadystatechange = function() {
				var redirectTo = msg.payload.redirectTo;
				if (request.readyState > 3) {
					try {
						var resp = JSON.parse(request.responseText);
						redirectTo = resp.redirectTo;
					} catch (error) {
						console.error(('lws-sdk:', 'could not parse login response'));
					}
					if (redirectTo) {
						window.location.href = redirectTo;
					}
				}
			};
			request.setRequestHeader('Content-type', 'application/json');
			request.send(body);
			return;
		}
		if (msg.payload.redirectTo) {
			window.location.href = msg.payload.redirectTo;
		}
	}
}

function resolveDomElements(el) {
	if (!el) return [];
	if (Array.isArray(el)) {
		return el;
	}
	if (typeof el === 'string') {
		return Array.prototype.slice.call(document.querySelectorAll(el));
	}
	return [el];
}

function initDomElements(config) {
	var els = resolveDomElements(config.ui.el);
	lws.components = els.map(function initLWSForDomElement(el) {
		return render(el);
	});
}

function teardownDomElements() {
	lws.activeComponent = null;
	if (!lws.components) return;
	lws.components.forEach(function teardownDomElement(component) {
		component.destroy();
	});
	lws.components = [];
}

function render(container) {
	if (!container) {
		throw new Error('Container should be a DOM element');
	}
	var component = { container: container };
	var el = document.createElement('div');
	el.className = 'lws-client-ui';

	var lwsButton = renderLWSButton();
	el.appendChild(lwsButton.el);

	var popup = renderPopup();
	el.appendChild(popup.el);

	container.innerHTML = '';
	container.appendChild(el);

	component.el = el;
	component.popup = popup;
	component.button = lwsButton;
	const displayPopup = comp => {
		var html;
		if (lws.status !== STATUSES.INITIALIZED) {
			html = initErrorTpl();
		} else {
			html = extensionUiTpl();
		}
		comp.popup.show(html);
	};

	lwsButton.el.addEventListener('click', function(evt) {
		evt.preventDefault();
		if (lws.activeComponent) {
			lws.activeComponent.popup.hide();
			lws.activeComponent = null;
		}
		displayPopup(component);

		lws.activeComponent = component;
	});

	component.destroy = function destroy() {
		this.container.innerHTML = '';
	};
	component.reinitUI = function reinitUI() {
		console.log('LWS: reinit UI');
		displayPopup(component);
	};
	return component;
}

function renderLWSButton() {
	var button = document.createElement('div');
	button.className = 'lws-button';
	button.innerHTML = tpl.lwsButton();
	return { el: button };
}

function renderPopup() {
	var popup = document.createElement('div');
	popup.className = 'lws-popup';

	var popupContainer = document.createElement('div');
	popupContainer.className = 'lws-popup__container';
	popupContainer.innerHTML = tpl.popupHeaderHTML();
	popup.appendChild(popupContainer);

	var close = document.createElement('a');
	close.className = 'lws-popup__close';
	popupContainer.appendChild(close);
	close.innerHTML = closeSvg;

	var content = document.createElement('div');
	content.className = 'lws-popup__content';
	popupContainer.appendChild(content);

	var component = {
		el: popup,
		content: content,
		close: close,
		show(html) {
			this.el.className = 'lws-popup lws-popup--visible';
			content.innerHTML = html;
		},
		hide() {
			this.el.className = 'lws-popup';
			content.innerHTML = '';
		}
	};

	close.addEventListener('click', function handleClose() {
		if (lws.activeComponent.popup !== component) {
			component.hide();
			return;
		}
		lws.activeComponent.popup.hide();
		lws.activeComponent = null;
	});

	return component;
}

function initErrorTpl() {
	return tpl.errorContentHtml({ extensionId: lws.config.extensionId || defaultExtensionId });
}

function extensionUiTpl() {
	return tpl.extensionUi({ uiUrl: lws.extConfig.uiUrl });
}

function sendToContent(msg, req, cb) {
	msg = fmtMessage(msg, req);
	if (cb) {
		var msgId = msg.meta.id;
		lws.reqs[msgId] = { req: msg };
		lws.reqs[msgId].handleRes = function handleRes(res) {
			clearTimeout(lws.reqs[msgId].timeout);
			delete lws.reqs[msgId];
			if (res.error) {
				return cb(res);
			}
			cb(null, res);
		};
		lws.reqs[msgId].timeout = setTimeout(function reqTimeout() {
			console.error('request timeout for', msg.type);
			lws.reqs[msgId].handleRes({
				error: true,
				payload: {
					code: 'response_timeout',
					message: 'Response timed out from content script'
				}
			});
		}, CONTENT_REQ_TIMEOUT);
	}
	window.postMessage(msg, window.location.href);
}

module.exports = lws;
