import React, { PureComponent } from 'react';
import ReactMarkdown from 'react-markdown';
import { connect } from 'react-redux';

import DocViewer from '../docViewer';
import './styles.scss';

class Message extends PureComponent {
  render() {
    const { docViewer, linkTarget } = this.props;
    const sender = this.props.message.get('sender');
    const text = this.props.message.get('text');
    const arabic = /[\u0600-\u06FF]/;
    const rtl = text && arabic.test(text);
    const customCss = this.props.message.get('customCss') && this.props.message.get('customCss').toJS();

    if (customCss && customCss.style === 'class') {
      customCss.css = customCss.css.replace(/^\./, '');
    }

    const { userTextColor, userBackgroundColor, assistTextColor, assistBackgoundColor } = this.context;
    let style;
    if (sender === 'response' && customCss && customCss.style === 'class') {
      style = undefined;
    } else if (sender === 'response' && customCss && customCss.style) {
      style = { cssText: customCss.css };
    } else if (sender === 'response') {
      style = { color: assistTextColor, backgroundColor: assistBackgoundColor };
    } else if (sender === 'client') {
      style = { color: userTextColor, backgroundColor: userBackgroundColor };
    }

    // Determine if the text is a string or an object
    const isTextString = typeof text === 'string';
    const isAudioObject = !isTextString && text && text.message && text.audio_message;

    return (
      <div
        className={sender === 'response' && customCss && customCss.style === 'class' ?
          `rw-response ${customCss.css}` :
          `rw-${sender}`}
        style={{ ...style, direction: `${rtl ? 'rtl' : 'ltr'}` }}
      >
        <div className="rw-message-text">
          {sender === 'response' ? (
            isTextString ? (
              <ReactMarkdown
                className={'rw-markdown'}
                source={text.message || text}
                linkTarget={(url) => {
                  if (!url.startsWith('mailto') && !url.startsWith('javascript')) return '_blank';
                  return undefined;
                }}
                transformLinkUri={null}
                renderers={{
                  link: props =>
                    docViewer ? (
                      <DocViewer src={props.href}>{props.children}</DocViewer>
                    ) : (
                      <a href={props.href} target={linkTarget || '_blank'} rel="noopener noreferrer" onMouseUp={e => e.stopPropagation()}>{props.children}</a>
                    )
                }}
              />
            ) : isAudioObject ? (
              <audio
                style={{ width: '250px', height: '50px' }}
                src={`data:audio/mp3;base64,${text.message}`}
                controls
              />
            ) : null
          ) : (
            isAudioObject ?
              <audio
                style={{ width: '250px', height: '50px' }}
                src={`data:audio/mp3;base64,${text.message}`}
                controls
              /> : (
                <div>{text.message || text}</div>
              )
          )}
        </div>
      </div>
    );
  }
}



Message.defaultTypes = {
  docViewer: false,
  linkTarget: '_blank'
};

const mapStateToProps = state => ({
  linkTarget: state.metadata.get('linkTarget'),
  docViewer: state.behavior.get('docViewer')
});

export default connect(mapStateToProps)(Message);
