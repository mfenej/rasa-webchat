import React, { useContext, useState } from 'react';

import close from 'assets/clear-button.svg';
import fullscreen from 'assets/fullscreen_button.svg';
import fullscreenExit from 'assets/fullscreen_exit_button.svg';
import './style.scss';
import ThemeContext from '../../../../ThemeContext';
import * as actions from '../../../../../../store/actions/index';
import { useDispatch } from 'react-redux';
import { Tooltip } from './Tooltip';

const  Header = ({
  title,
  subtitle,
  fullScreenMode,
  toggleFullScreen,
  toggleChat,
  showCloseButton,
  showFullScreenButton,
  connected,
  connectingText,
  closeImage,
  profileAvatar,
  showClearChatButton,
  clearChatUrl,
  customSessionId,
  requestHeaders,
  trySendInitPayload,
  clearChatCommand,
}) => {
  const { mainColor } = useContext(ThemeContext);
  const dispatch = useDispatch()
  const clearData ={
    "sessionId": customSessionId
  }
  const [error, setError] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const ClearChat = async () => {
    try {
      const response = await fetch(clearChatUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(clearData)
      });
      if (response.ok) {
        dispatch(actions.dropMessages())
        trySendInitPayload({forced:true})
        setError(false)
      }
      if (!response.ok) {
        setError(true)
        setTimeout(() => {
          setError(false)
        }, 1500);
      }
    } catch (error) {
      setError(true)
      setTimeout(() => {
        setError(false)
      }, 1500);
    }
  }
  const deleteIconFun = (width, height, color) => {
    return (
      <svg className='deleteIcon' width={`${width}px`} height={`${height}px`} viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill={`#${color}`} stroke={`#${color}`}>
        <g id="SVGRepo_bgCarrier" strokeWidth="0" />
        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
        <g id="SVGRepo_iconCarrier">
          <path className='deleteIconPath' fill={`#${color}`} d="M160 256H96a32 32 0 0 1 0-64h256V95.936a32 32 0 0 1 32-32h256a32 32 0 0 1 32 32V192h256a32 32 0 1 1 0 64h-64v672a32 32 0 0 1-32 32H192a32 32 0 0 1-32-32V256zm448-64v-64H416v64h192zM224 896h576V256H224v640zm192-128a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32zm192 0a32 32 0 0 1-32-32V416a32 32 0 0 1 64 0v320a32 32 0 0 1-32 32z" />
        </g>
      </svg>
    );
  };
  const clearChatConfirmation =()=>{
    setShowDialog(true)
  }
  return (
    <div className="rw-header-and-loading" style={{position:"relative"}}>
      <div style={{ backgroundColor: mainColor }}className={`rw-header ${subtitle ? 'rw-with-subtitle' : ''}`}>
        {
          profileAvatar && (
            <img src={profileAvatar} className="rw-avatar" alt="chat avatar" />
          )
        }
        <div className="rw-header-buttons">
        {
            showClearChatButton &&
            <Tooltip content="Clear Chat" >
            <button className="rw-clearChat" onClick={clearChatConfirmation} style={{cursor:"pointer"}}>
             {deleteIconFun(20, 20, 'fff')}
            </button>
            </Tooltip>
          }
          {
            showDialog? <div className='delete-chat-conf-btn' style={{position:"absolute",top:"0px",width:"230px",right:"0px",height:"100px",background:"white",color:"red",zIndex:"99",borderRadius:"5px",padding:"5px"}}>
               <div className='delete-chat-conf-title' >Are you sure you want to Clear the chat?</div>  
               <div  className='delete-chat-btns-container' style={{marginTop:"5px",display:"flex",height:"40px",justifyContent:"center",alignItems:"center"}}>
               <div className='delete-chatbot-chat-btns' style={{width:"50%"}}> <button style={{border:"none",outline:"none",cursor:"pointer",padding:"10px"}} onClick={(e)=>{clearChatCommand(e); setShowDialog(false)}}> <i className='sapUiIcon si-sys-enter'></i> YES </button> </div> <div  className='delete-chatbot-chat-btns' style={{width:"50%"}}> <button  style={{border:"none",outline:"none",cursor:"pointer",padding:"10px"}} onClick={()=>{setShowDialog(false)}}>  <i className='sapUiIcon si-cancel'></i> NO </button> </div>
               </div>
               </div> :<></>
          }
          {
            showFullScreenButton &&
            <button className="rw-toggle-fullscreen-button" onClick={toggleFullScreen} style={{cursor:"pointer"}}>
              <img
                className={`rw-toggle-fullscreen ${fullScreenMode ? 'rw-fullScreenExitImage' : 'rw-fullScreenImage'}`}
                src={fullScreenMode ? fullscreenExit : fullscreen}
                alt="toggle fullscreen"
              />
            </button>
          }
          {
            showCloseButton &&
            <Tooltip content="Minimize" >
            <button className="rw-close-button" onClick={toggleChat}>
              <img
                className={`rw-close ${closeImage ? '' : 'rw-default'}`}
                src={closeImage || close}
                alt="close"
              />
            </button>
            </Tooltip>
          }
        </div>
        <h4 className={`rw-title ${profileAvatar && 'rw-with-avatar'}`}>{title}</h4>
        {subtitle && <span className={profileAvatar && 'rw-with-avatar'}>{subtitle}</span>}
      </div>
      {error && <div
        className='feed-error-popup'
        style={{
          position: "absolute",
          background: "#D63838",
          right: "0px",
          top: "0px",
          width: "150px",
          height: "55px",
          borderRadius: "7px",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      > {`Error Clearing Chat`} </div>

      }
      {
        !connected &&
        <span className="rw-loading">
          {connectingText}
        </span>
      }
    </div>);
};


export default Header;
