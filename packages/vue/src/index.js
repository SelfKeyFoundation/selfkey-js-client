import Vue from 'vue';
import lws from '@selfkey/lws-js-client';

Vue.component('lws-button', {
	template: '<div v-bind:class="className"></div>',
	props: [
		'attributes',
		'website',
		'onAuthResponse',
		'rootEndpoint',
		'endpoints',
		'extensionId',
		'meta',
		'did',
		'className'
	],
	mounted() {
		this.$nextTick(() => {
			const {
				attributes,
				website,
				onAuthResponse,
				rootEndpoint,
				endpoints,
				extensionId,
				did,
				meta
			} = this;
			lws.init({
				attributes,
				website,
				onAuthResponse,
				rootEndpoint,
				endpoints,
				meta,
				did,
				extensionId,
				ui: { el: this.$el }
			});
		});
	},
	beforeDestroy() {
		lws.teardown();
	}
});
