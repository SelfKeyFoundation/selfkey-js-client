const downloadSvg = require('./images/download.svg');
const skLogoHeader = require('./images/sk-logo-header.png');
const skLogo = require('./images/sk-logo.png');

exports.errorContentHtml = ({ extensionId }) => `
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

exports.popupHeaderHTML = () => `
<div class="lws-popup__header">
	<img src="${skLogoHeader}" height="50" alt="SelfKey" class="logo">
	<h1>Login with SelfKey</h1>
</div>
`;

exports.lwsButton = () => `
<img class="lws-button__logo" src="${skLogo}"/><span>Login with Selfkey</span>
`;

exports.extensionUi = ({ uiUrl }) => `<iframe class="lws-ext-ui" src="${uiUrl}"/>`;
