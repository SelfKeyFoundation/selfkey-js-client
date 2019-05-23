import React, { Component } from 'react';
import lws from '@selfkey/lws-js-client';

export class LWSButton extends Component {
	componentDidMount() {
		const {
			attributes,
			website,
			onAuthResponse,
			rootEndpoint,
			endpoints,
			extensionId,
			did,
			meta
		} = this.props;
		lws.init({
			attributes,
			website,
			onAuthResponse,
			rootEndpoint,
			endpoints,
			meta,
			did,
			extensionId,
			ui: { el: this.el }
		});
	}

	componentWillUnmount() {
		lws.teardown();
	}

	render() {
		return <div ref={el => (this.el = el)} className={this.props.className} />;
	}
}
