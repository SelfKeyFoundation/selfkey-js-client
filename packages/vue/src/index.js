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
				meta
			} = this;
			lws.init({
				attributes,
				website,
				onAuthResponse,
				rootEndpoint,
				endpoints,
				meta,
				extensionId,
				ui: { el: this.$el }
			});
		});
	},
	beforeDestroy() {
		lws.teardown();
	}
});
