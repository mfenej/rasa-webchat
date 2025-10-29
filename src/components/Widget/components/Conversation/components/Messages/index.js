import React, { Component,createRef } from 'react';
import { connect } from 'react-redux';
import { MESSAGES_TYPES } from 'constants';
import { Video, Image, Message, Carousel, Buttons } from 'messagesComponents';
import './styles.scss';
import ThemeContext from '../../../../ThemeContext';
import Feedback from './Feedback';




const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const formatDate = (date) => {
  const dateToFormat = new Date(date);
  const showDate = isToday(dateToFormat) ? '' : `${dateToFormat.toLocaleDateString()} `;
  return `${showDate}${dateToFormat.toLocaleTimeString('en-US', { timeStyle: 'short' })}`;
};

const scrollToBottom = () => {
  const messagesDiv = document.getElementById('rw-messages');
  if (messagesDiv) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
};

class Messages extends Component {
  constructor(props) {
    super(props);
    this.state = {
      reportedMessages: new Set(),
    };
  }

  componentDidMount() {
    scrollToBottom();
  }

  componentDidUpdate() {
    scrollToBottom();
  }

  getComponentToRender = (message, index, isLast) => {
    const { params } = this.props;
    const ComponentToRender = (() => {
      switch (message.get('type')) {
        case MESSAGES_TYPES.TEXT: {
          return Message;
        }
        case MESSAGES_TYPES.CAROUSEL: {
          return Carousel;
        }
        case MESSAGES_TYPES.VIDREPLY.VIDEO: {
          return Video;
        }
        case MESSAGES_TYPES.IMGREPLY.IMAGE: {
          return Image;
        }
        case MESSAGES_TYPES.BUTTONS: {
          return Buttons;
        }
        case MESSAGES_TYPES.CUSTOM_COMPONENT:
          return connect(
            store => ({ store }),
            dispatch => ({ dispatch })
          )(this.props.customComponent);
        default:
          return null;
      }
    })();
    if (message.get('type') === 'component') {
      const messageProps = message.get('props');
      return (<ComponentToRender
        id={index}
        {...(messageProps.toJS ? messageProps.toJS() : messageProps)}
        isLast={isLast}
      />);
    }
    return <ComponentToRender id={index} params={params} message={message} isLast={isLast} />;
  }
  markMessageAsReported = (index) => {
    this.setState((prevState) => ({
      reportedMessages: new Set(prevState.reportedMessages).add(index),
    }));
  };
  render() {
    const { displayTypingIndication, profileAvatar,customData} = this.props;
    const renderMessages = () => {
      const {
        messages,
        showMessageDate
      } = this.props;

      if (messages.isEmpty()) return null;

      const groups = [];
      let group = null;

      const dateRenderer = typeof showMessageDate === 'function' ? showMessageDate :
        showMessageDate === true ? formatDate : null;

      const renderMessageDate = (message) => {
        const timestamp = message.get('timestamp');

        if (!dateRenderer || !timestamp) return null;
        const dateToRender = dateRenderer(message.get('timestamp', message));
        return dateToRender
          ? <span className="rw-message-date">{dateRenderer(message.get('timestamp'), message)}</span>
          : null;
      };

      let lastClientMessage = null;
      const messagePairs = new Map(); 
      let lastResponseIndex = [];
      let messagesJs = messages.toJS();
      const clientMessages = messagesJs.filter(msg => msg['sender'] === "client");
      // messages.toJS().findLast((e)=> e.text=== clientMessages.toJS()[clientMessages.toJS().length - 1].text )
      if (clientMessages) {
        let lastMessages =messagesJs.slice( messagesJs.findLastIndex((e)=> e?.text===clientMessages[clientMessages.length - 1]?.text) );
        lastResponseIndex = lastMessages
      } else {
        messages?.forEach((msg, index) => {
          if (msg.get('sender') === 'response') {
            lastResponseIndex=[msg.toJS()]
          }
        });
      }

      const renderMessage = (message, index) => {
        const sender = message.get('sender');
        const isReported = message.get('isReported');
        const isStateReported = this.state.reportedMessages.has(index); // Check if the message is reported

        const text = message.get('text') || 'Non-text message';

        if (sender === 'client') {
          lastClientMessage = text; 
        } else if (sender === 'response' && lastClientMessage) {
          messagePairs.set(index, lastClientMessage);
        }    
        return (
          <div className={'rw-message'} key={index} >
          {this.getComponentToRender(message, index, index === messages.size - 1)}
          {sender === 'response' &&
              message.get('type') !== MESSAGES_TYPES.BUTTONS && 
              this.props.withFeedback && lastResponseIndex.some((e) => (e?.text === message.toJS()?.text && e?.timestamp === message.toJS()?.timestamp))
              && !isReported && !isStateReported && message.get('text') && messagePairs.get(index) &&
              <Feedback customSessionId={this.props.customSessionId} index={index} requestHeaders={this.props.requestHeaders} feedbackUrl={this.props.feedbackUrl} customData={customData} messagePairs={messagePairs} markMessageAsReported={this.markMessageAsReported}  message={message} />}
          </div>
        );
      };

      messages.forEach((msg, index) => {
        if (msg.get('hidden')) return;
        if (group === null || group.from !== msg.get('sender')) {
          if (group !== null) groups.push(group);

          group = {
            from: msg.get('sender'),
            messages: []
          };
        }

        group.messages.push(renderMessage(msg, index));
      });

      groups.push(group); // finally push last group of messages.

      return groups.map((g, index) => (
        <div className={`rw-group-message rw-from-${g && g.from}`} key={`group_${index}`}>
          {g.messages}
        </div>
      ));
    };
    const { conversationBackgroundColor, assistBackgoundColor } = this.context;

    return (
      <div id="rw-messages" style={{ backgroundColor: conversationBackgroundColor }} className="rw-messages-container">
        { renderMessages() }
        {displayTypingIndication && (
          <div className={`rw-message rw-typing-indication ${profileAvatar && 'rw-with-avatar'}`}>
            {
              profileAvatar &&
              <img src={profileAvatar} className="rw-avatar" alt="profile" />
            }
            <div style={{ backgroundColor: assistBackgoundColor }}className="rw-response">
              <div id="wave">
                <span className="rw-dot" />
                <span className="rw-dot" />
                <span className="rw-dot" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
Messages.contextType = ThemeContext;


Message.defaultTypes = {
  displayTypingIndication: false
};

export default connect(store => ({
  messages: store.messages,
  displayTypingIndication: store.behavior.get('messageDelayed')
}))(Messages);
