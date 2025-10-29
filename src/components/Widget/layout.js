import React from 'react';
import { connect } from 'react-redux';

import Conversation from './components/Conversation';
import Launcher from './components/Launcher';
import './style.scss';

const WidgetLayout = (props) => {
  const classes = props.embedded ? ['rw-widget-embedded'] : ['rw-widget-container'];
  if (props.fullScreenMode) {
    classes.push('rw-full-screen');
  }
  const showCloseButton =
    props.showCloseButton !== undefined ? props.showCloseButton : !props.embedded;
  const isVisible = props.isChatVisible && !(props.hideWhenNotConnected && !props.connected);
  const chatShowing = props.isChatOpen || props.embedded;

  if (chatShowing && !props.embedded) {
    classes.push('rw-chat-open');
  }

  return isVisible ? (
    <div className={classes.join(' ')}>
      {chatShowing && (
        <Conversation
          title={props.title}
          subtitle={props.subtitle}
          sendMessage={props.onSendMessage}
          profileAvatar={props.profileAvatar}
          toggleChat={props.toggleChat}
          isChatOpen={props.isChatOpen}
          toggleFullScreen={props.toggleFullScreen}
          fullScreenMode={props.fullScreenMode}
          disabledInput={props.disabledInput}
          params={props.params}
          showFullScreenButton={props.showFullScreenButton}
          {...{ showCloseButton }}
          connected={props.connected}
          connectingText={props.connectingText}
          closeImage={props.closeImage}
          customComponent={props.customComponent}
          showMessageDate={props.showMessageDate}
          inputTextFieldHint={props.inputTextFieldHint}
          withAudio={props.withAudio}
          withImage={props.withImage}
          showClearChatButton={props.showClearChatButton}
          clearChatUrl={props.clearChatUrl}
          withFeedback={props.withFeedback}
          feedbackUrl={props.feedbackUrl}
          requestHeaders={props.requestHeaders}
          customData={props.customData}
          customSessionId={props.customSessionId}
          trySendInitPayload={props.trySendInitPayload}
          clearChatCommand={props.clearChatCommand}

        />
      )}
      {!props.embedded && (
        <Launcher
          toggle={props.toggleChat}
          isChatOpen={props.isChatOpen}
          badge={props.badge}
          fullScreenMode={props.fullScreenMode}
          openLauncherImage={props.openLauncherImage}
          closeImage={props.closeImage}
          displayUnreadCount={props.displayUnreadCount}
          tooltipPayload={props.tooltipPayload}
        />
      )}
    </div>
  ) : null;
};

const mapStateToProps = state => ({
  isChatVisible: state.behavior.get('isChatVisible'),
  isChatOpen: state.behavior.get('isChatOpen'),
  disabledInput: state.behavior.get('disabledInput'),
  connected: state.behavior.get('connected'),
  connectingText: state.behavior.get('connectingText')
});



export default connect(mapStateToProps)(WidgetLayout);
