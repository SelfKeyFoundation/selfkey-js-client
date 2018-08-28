(function(window, document) {
	/* global define */
	'use strict';
	var MSG_SRC = 'lws_client';
	var CONTENT_SRC = 'lws_content';
	var CONTENT_REQ_TIMEOUT = 5000;

	var STATUSES = {
		READY: 0,
		INITIALIZING: 1,
		INITIALIZED: 2,
		TEARING_DOWN: 3,
		ERROR: 4
	};

	var extensionId = 'test';

	var lws = {
		msgId: 0,
		status: STATUSES.READY,
		reqs: {}
	};

	var closeSvg =
		'<svg width="38" height="38" xmlns="http://www.w3.org/2000/svg"><g transform="translate(1 1)" fill="none" fill-rule="evenodd"><circle stroke="#1D505F" fill="#262F39" cx="18" cy="18" r="18"/><path d="M10.815 9.64L9.64 10.814 16.824 18l-7.185 7.185 1.176 1.176L18 19.176l7.185 7.185 1.176-1.176L19.176 18l7.185-7.185-1.176-1.176L18 16.824z" fill="#23E6FE" fill-rule="nonzero"/></g></svg>';

	var skLogo =
		'data:image/png;base64,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';
	var skLogoHeader =
		'data:image/png;base64,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';

	var downloadSvg =
		'<svg width="74" height="74" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient x1="50%" y1="100%" x2="50%" y2="0%" id="a"><stop stop-color="#1CA9BA" offset="0%"/><stop stop-color="#23E6FE" offset="100%"/></linearGradient></defs><path d="M37 0C16.577 0 0 16.577 0 37s16.577 37 37 37 37-16.577 37-37S57.423 0 37 0zm0 2.242C56.21 2.242 71.758 17.79 71.758 37S56.21 71.758 37 71.758 2.242 56.21 2.242 37 17.79 2.242 37 2.242zm0 3.364c-.618 0-1.121.504-1.121 1.121 0 .618.503 1.121 1.121 1.121s1.121-.503 1.121-1.12c0-.618-.503-1.122-1.121-1.122zm5.935.578a1.125 1.125 0 0 0-1.13.907 1.127 1.127 0 0 0 .884 1.318 1.127 1.127 0 0 0 1.319-.88 1.13 1.13 0 0 0-.88-1.323c-.066-.009-.128-.017-.193-.022zM31.1 6.19a1.28 1.28 0 0 0-.223.017 1.123 1.123 0 0 0 .438 2.203 1.118 1.118 0 0 0 .88-1.318 1.125 1.125 0 0 0-1.095-.902zm-5.676 1.72a1.119 1.119 0 0 0-1.042 1.55c.236.575.89.847 1.463.61.574-.24.845-.893.609-1.467a1.127 1.127 0 0 0-1.03-.692zm23.187 0a1.126 1.126 0 0 0-1.065.693 1.124 1.124 0 0 0 .61 1.467 1.118 1.118 0 0 0 1.462-.609 1.119 1.119 0 0 0-1.007-1.55zm-28.416 2.795c-.228 0-.451.066-.64.193a1.12 1.12 0 1 0 1.249 1.861 1.116 1.116 0 0 0 .31-1.55 1.122 1.122 0 0 0-.919-.504zm33.64 0a1.121 1.121 0 0 0-.95.504 1.12 1.12 0 0 0 1.861 1.244c.167-.246.228-.552.171-.841a1.098 1.098 0 0 0-.477-.714 1.1 1.1 0 0 0-.604-.193zM15.61 14.471a1.13 1.13 0 0 0-.805.333 1.116 1.116 0 0 0 0 1.58 1.116 1.116 0 0 0 1.58 0 1.116 1.116 0 0 0 0-1.58 1.102 1.102 0 0 0-.775-.333zm42.812 0a1.13 1.13 0 0 0-.806.333 1.116 1.116 0 0 0 0 1.58 1.116 1.116 0 0 0 1.581 0 1.116 1.116 0 0 0 0-1.58 1.102 1.102 0 0 0-.775-.333zm3.762 4.59a1.115 1.115 0 0 0-.942 1.739 1.113 1.113 0 0 0 1.551.31 1.118 1.118 0 0 0-.609-2.05zm-50.336 0c-.38-.01-.74.18-.95.495a1.12 1.12 0 0 0 .31 1.554 1.12 1.12 0 1 0 1.245-1.861 1.132 1.132 0 0 0-.605-.188zm53.13 5.233a1.12 1.12 0 0 0-1.047 1.546 1.124 1.124 0 0 0 2.077-.858 1.123 1.123 0 0 0-1.03-.688zm-55.92 0a1.116 1.116 0 0 0-1.06.692 1.126 1.126 0 0 0 .605 1.468 1.123 1.123 0 0 0 1.467-.61 1.118 1.118 0 0 0-.609-1.462 1.057 1.057 0 0 0-.403-.088zm57.638 5.68a.961.961 0 0 0-.224.018 1.127 1.127 0 0 0-.88 1.319 1.127 1.127 0 0 0 1.318.884 1.13 1.13 0 0 0 .885-1.322 1.121 1.121 0 0 0-1.1-.898zm-59.355 0a1.122 1.122 0 1 0 1.07 1.337 1.121 1.121 0 0 0-.877-1.319c-.066-.008-.127-.017-.193-.017zm-.613 5.905c-.617 0-1.12.503-1.12 1.121s.503 1.121 1.12 1.121c.618 0 1.121-.503 1.121-1.121s-.503-1.121-1.12-1.121zm60.546 0c-.618 0-1.121.503-1.121 1.121s.503 1.121 1.12 1.121c.618 0 1.122-.503 1.122-1.121s-.504-1.121-1.121-1.121zM7.314 41.783a1.123 1.123 0 1 0 .215 2.225 1.124 1.124 0 1 0-.215-2.225zm59.407 0a1.125 1.125 0 0 0-1.13.906 1.127 1.127 0 0 0 .88 1.319 1.13 1.13 0 0 0 1.323-.88 1.13 1.13 0 0 0-.885-1.323c-.061-.01-.122-.018-.188-.022zm-1.726 5.676a1.13 1.13 0 0 0-1.064.696 1.12 1.12 0 0 0 .609 1.463 1.126 1.126 0 0 0 1.467-.604 1.123 1.123 0 0 0-.609-1.468 1.167 1.167 0 0 0-.403-.087zm-55.955.004c-.15 0-.298.026-.438.083-.272.114-.49.333-.605.61a1.142 1.142 0 0 0-.004.858c.24.573.893.845 1.467.604a1.1 1.1 0 0 0 .609-.604 1.121 1.121 0 0 0-1.03-1.55zm53.152 5.234a1.12 1.12 0 1 0 .6.188 1.048 1.048 0 0 0-.6-.188zm-50.35 0a1.092 1.092 0 0 0-.634.188 1.126 1.126 0 0 0-.311 1.555 1.126 1.126 0 0 0 1.559.307 1.12 1.12 0 0 0-.613-2.05zm3.767 4.59a1.107 1.107 0 0 0-.805.328 1.116 1.116 0 0 0 0 1.581 1.116 1.116 0 0 0 1.58 0 1.116 1.116 0 0 0 0-1.58 1.08 1.08 0 0 0-.775-.33zm42.812 0a1.107 1.107 0 0 0-.806.328 1.116 1.116 0 0 0 0 1.581 1.116 1.116 0 0 0 1.581 0 1.116 1.116 0 0 0 0-1.58 1.08 1.08 0 0 0-.775-.33zm-38.217 3.762c-.381-.009-.74.18-.95.495a1.12 1.12 0 1 0 .95-.495zm33.627 0a1.12 1.12 0 0 0-.635.184 1.121 1.121 0 0 0-.307 1.56 1.125 1.125 0 0 0 1.555.31 1.126 1.126 0 0 0 .307-1.559 1.102 1.102 0 0 0-.92-.495zm-28.39 2.794a1.12 1.12 0 0 0-1.059.697 1.121 1.121 0 1 0 1.463-.609 1.146 1.146 0 0 0-.403-.088zm23.152 0c-.149 0-.298.031-.433.088a1.127 1.127 0 0 0-.614 1.467 1.126 1.126 0 0 0 2.076 0 1.121 1.121 0 0 0 0-.858 1.12 1.12 0 0 0-1.029-.697zM31.127 65.57a1.122 1.122 0 0 0-.25 2.22 1.118 1.118 0 0 0 1.318-.88 1.118 1.118 0 0 0-1.068-1.34zm11.781.004a.906.906 0 0 0-.219.018 1.125 1.125 0 0 0-.884 1.318 1.132 1.132 0 0 0 1.323.885c.288-.061.547-.232.713-.477a1.15 1.15 0 0 0 .167-.846 1.121 1.121 0 0 0-1.1-.898zM37 66.152c.618 0 1.121.503 1.121 1.12 0 .618-.503 1.122-1.121 1.122a1.123 1.123 0 0 1-1.121-1.121c0-.618.503-1.121 1.121-1.121zm13.482-28.306c.69.69.69 1.81 0 2.503L38.81 52.02c-.02.02-.041.037-.062.055-.058.063-.12.125-.187.18-.02.017-.042.031-.063.048-.025.017-.05.038-.076.055-.025.018-.05.031-.077.047-.023.014-.047.029-.071.042l-.08.04c-.025.011-.05.024-.077.035a.683.683 0 0 1-.08.028c-.027.01-.055.021-.083.03-.027.008-.053.014-.08.02-.03.006-.059.016-.088.021-.03.007-.062.01-.093.015l-.078.011a1.798 1.798 0 0 1-.349 0l-.078-.011c-.03-.006-.062-.01-.093-.015-.03-.005-.058-.015-.088-.02-.026-.007-.052-.013-.08-.022-.028-.008-.056-.019-.084-.029-.026-.009-.053-.017-.08-.028l-.076-.036c-.026-.012-.053-.024-.08-.04a1.257 1.257 0 0 1-.071-.04c-.026-.017-.051-.03-.077-.048-.025-.017-.05-.038-.076-.055-.02-.017-.042-.03-.063-.048a1.689 1.689 0 0 1-.13-.118L24.52 40.467a1.768 1.768 0 0 1 0-2.502 1.767 1.767 0 0 1 2.5 0l8.654 8.653V23.769a1.769 1.769 0 1 1 3.537 0v22.849l8.771-8.772c.69-.69 1.81-.69 2.501 0z" fill="url(#a)" fill-rule="nonzero"/></svg>';

	var errorContentHtml = `
<div class="err-no-plugin">
	<div class="area-title">
		${downloadSvg}
		<h2>Action Required</h2>
		<h3>Install Login With SelfKey Browser Extension</h3>
	</div>
	<div class="area-form">
			<p class="support-text">
					Login With SelfKey is a browser extension that allows you to securely login to this website through your SelfKey ID and Ethereum address, powered by the SelfKey Identity Wallet.
			</p>
			<div class="form-submit-row">
				<a href="https://chrome.google.com/webstore/detail/${extensionId}" target="_blank" class="sk-btn sk-btn__primary">Install Browser Extension</a>
			</div>
	</div>
</div>
	`;

	var popupHeaderHTML = `
<div class="lws-popup__header">
	<img src="${skLogoHeader}" height="50" alt="SelfKey" class="logo">
	<h1>Login with SelfKey</h1>
</div>
	`;

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
		initDomElements(config);
		window.addEventListener('message', handleContentMessage);
		sendToContent({ type: 'init', payload: 'config' }, {}, function initCb(err, res) {
			if (err) {
				console.error(err);
				lws.status = STATUSES.ERROR;
				lws.initError = err;
				return;
			}
			lws.status = STATUSES.INITIALIZED;
			lws.extConfig = res.payload;
		});
	};

	lws.teardown = function initLWS() {
		teardownDomElements();
		sendToContent({ type: 'teardown' });
		lws.initError = null;
		lws.status = STATUSES.READY;
		lws.extConfig = null;
	};

	function handleContentMessage(evt) {
		var msg = evt.data;
		if (window !== evt.source) return;
		if (!msg || !msg.type || !msg.meta || msg.meta.src !== CONTENT_SRC) return;
		if (msg.meta.id && lws.reqs[msg.meta.id]) {
			return lws.reqs[msg.meta.id].handleRes(msg);
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
		var els = resolveDomElements(config.el);
		lws.els = els.map(function initLWSForDomElement(el) {
			return render(el);
		});
	}

	function teardownDomElements() {
		if (!lws.els) return;
		lws.els.forEach(function teardownDomElement(el) {
			el.destroy();
		});
		lws.els = [];
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

		lwsButton.el.addEventListener('click', function(evt) {
			evt.preventDefault();
			var html;

			if (lws.status !== STATUSES.INITIALIZED) {
				html = initErrorTpl();
			} else {
				html = extensionUiTpl();
			}
			popup.show(html);
		});

		component.destroy = function destroy() {
			this.container.innerHTML = '';
		};
		return el;
	}

	function renderLWSButton() {
		var button = document.createElement('div');
		button.className = 'lws-button';
		button.innerHTML =
			'<img class="lws-button__logo" src="' + skLogo + '"/><span>Login with Selfkey</span>';
		return { el: button };
	}

	function renderPopup() {
		var popup = document.createElement('div');
		popup.className = 'lws-popup';

		var popupContainer = document.createElement('div');
		popupContainer.className = 'lws-popup__container';
		popupContainer.innerHTML = popupHeaderHTML;
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
			component.hide();
		});

		return component;
	}

	function initErrorTpl() {
		return errorContentHtml;
	}

	function extensionUiTpl() {
		return 'iframe';
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
				console.error('request timeout for', msg.init);
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
	if (typeof define === 'function' && define.amd) {
		define(['lws'], function lwsFactory() {
			return lws;
		});
	} else if (typeof module === 'object' && module.exports) {
		module.exports = lws;
	} else {
		window.lws = lws;
	}
})(window, document);
