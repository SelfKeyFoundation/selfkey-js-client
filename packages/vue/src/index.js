import Vue from 'vue';
import lws from 'lws-js-client';

Vue.component('lws-button', {
	template: '<div v-bind:class="className"></div>',
	props: ['attributes', 'website', 'onAuthResponse', 'className'],
	mounted() {
		this.$nextTick(() => {
			const { attributes, website, onAuthResponse } = this;
			lws.init({ attributes, website, onAuthResponse, el: this.$el });
		});
	},
	beforeDestroy() {
		lws.teardown();
	}
});
