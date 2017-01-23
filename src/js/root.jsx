import React, { Component } from 'react';
import { Provider } from 'react-redux';

import { Widget } from './components/widget';

export class Root extends Component {
    static childContextTypes = {
        document: React.PropTypes.object,
        hostContext: React.PropTypes.object
    };

    getChildContext() {
        return {
            document: this.props.document,
            hostContext: this.props.hostContext
        };
    }

    render() {
        const {store} = this.props;
        return <Provider store={ store }>
                   <Widget />
               </Provider>;
    }
}
