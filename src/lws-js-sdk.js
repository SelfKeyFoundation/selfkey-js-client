(function(window, document) {
	'use strict';

	function initLocal() {
		// TODO: implement local LWS
	}

	function initExtension(config) {
		// injecting lws-inject.js from browser extension
		var jsTag;
		var id = config.id || 'lws-script-container';
		var lwsJs = document.getElementsByTagName('script')[0];
		if (document.getElementById(id)) {
			return;
		}
		jsTag = document.createElement('script');
		jsTag.id = id;
		jsTag.onload = extensionScriptLoadHandler(config);
		jsTag.src = config.clientUrl;
		jsTag.parentNode.insertBefore(jsTag, lwsJs);
	}

	function extensionScriptLoadHandler(config) {
		return function extensionOnLoad() {
			if (!window.lws.controller) {
				return initLocal();
			}
		};
	}

	function initRemoteLWS(config) {
		if (!window.lws.controller) {
			window.lws.loadingActions.push({
				type: 'init',
				config: config
			});
			return;
		}
		window.lws.controller.init(config);
	}

	function teardownRemoteLWS() {
		if (!window.lws.controller) {
			window.lws.loadingActions.push({
				type: 'teardown'
			});
			return;
		}
		window.lws.controller.teardown();
	}

	function main() {
		if (!window.lws || !window.lws.data || !window.lws.data.clientUrl) {
			return initLocal();
		}
		window.lws.init = initRemoteLWS;
		window.lws.teardown = teardownRemoteLWS;
		window.lws.loadingActions = [];
		initExtension(window.lws.data);
	}

	main();
})(window, document);
