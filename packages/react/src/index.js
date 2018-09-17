import React, { Component } from 'react';
import lws from 'lws-js-client';

export class LWSButton extends Component {
	componentDidMount() {
		const { attributes, website, onAuthResponse } = this.props;
		lws.init({ attributes, website, onAuthResponse, el: this.el });
	}

	componentWillUnmount() {
		lws.teardown();
	}

	render() {
		return <div ref={el => (this.el = el)} className={this.props.className} />;
	}
}
