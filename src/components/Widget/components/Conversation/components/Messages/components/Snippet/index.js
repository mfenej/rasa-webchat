import React, { PureComponent } from 'react';
import { PROP_TYPES } from 'constants';

import './styles.scss';

class Snippet extends PureComponent {
  render() {
    const arabic = /[\u0600-\u06FF]/;
    const rtl = this.props.message && arabic.test(this.props.message.get('content'))
    return (
      <div className="rw-snippet" style={{direction:`${rtl?"rtl":"ltr"}`}}>
        <b className="rw-snippet-title">
          { this.props.message.get('title') }
        </b>
        <div className="rw-snippet-details">
          <a href={this.props.message.get('link')} target={this.props.message.get('target')} className="rw-link">
            { this.props.message.get('content') }
          </a>
        </div>
      </div>
    );
  }
}

Snippet.propTypes = {
  message: PROP_TYPES.SNIPPET
};

export default Snippet;
