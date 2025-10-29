import React from 'react';

import Header from './components/Header';
import Messages from './components/Messages';
import Sender from './components/Sender';
import './style.scss';

const Conversation = props =>
  <div className="rw-conversation-container">
    <Header
      title={props.title}
      subtitle={props.subtitle}
      toggleChat={props.toggleChat}
      toggleFullScreen={props.toggleFullScreen}
      fullScreenMode={props.fullScreenMode}
      showCloseButton={props.showCloseButton}
      showFullScreenButton={props.showFullScreenButton}
      connected={props.connected}
      connectingText={props.connectingText}
      closeImage={props.closeImage}
      profileAvatar={props.profileAvatar}
      showClearChatButton={props.showClearChatButton}
      clearChatUrl={props.clearChatUrl}
      customSessionId={props.customSessionId}
      requestHeaders={props.requestHeaders}
      trySendInitPayload={props.trySendInitPayload}
      clearChatCommand={props.clearChatCommand}
    />
    <Messages
      profileAvatar={props.profileAvatar}
      params={props.params}
      customComponent={props.customComponent}
      showMessageDate={props.showMessageDate}
      withFeedback={props.withFeedback}
      feedbackUrl={props.feedbackUrl}
      requestHeaders={props.requestHeaders}
      customData={props.customData}
      customSessionId={props.customSessionId}
    />
    <Sender
      withAudio={props.withAudio}
      withImage={props.withImage}
      sendMessage={props.sendMessage}
      disabledInput={props.disabledInput}
      inputTextFieldHint={props.inputTextFieldHint}
    />
  </div>;



export default Conversation;
