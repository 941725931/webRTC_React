import React, { Component } from 'react';
import ArRTC from 'ar-rtc-sdk';
import Config from '../anyrtc_config';
import './App.css';

export default class App extends Component {
    constructor(){
        super();
        this.channelInput = React.createRef();
    }

    state = {
        channel: '6666',
        isLogin: false,
        rtcClient: null,
        videoDevices: null,
        audioDevices: null,
        audioTrack: null,
        videoTrack: null,
        list: []
    }

    componentDidMount() {
        this.createRtcClient();
    }

    createRtcClient = () => {
        const config = { mode: "rtc", codec: "h264" };
        const rtcClient = ArRTC.createClient(config);
        this.setState({ rtcClient }, () => {
            this.listenUserPublished();
            this.listenUserUnpublished();
        });
    }

    listenUserUnpublished = () => {
        const { rtcClient, list } = this.state;
        rtcClient.on("user-unpublished", async (user, mediaType) => {
            if (mediaType === 'video') {
                const index = list.findIndex(item => item.uid === user.uid);
                if (index !== -1) {
                    list.splice(index, 1);
                    this.setState({ list });
                }
            }
        });
    };

    listenUserPublished = () => {
        const { rtcClient, list } = this.state;
        rtcClient.on("user-published", async (user, mediaType) => {
            await rtcClient.subscribe(user, mediaType);
            if (mediaType === 'video') {
                list.push(user);
                this.setState({ list }, () => {
                    user.videoTrack.play('distal' + user.uid);
                });
            } else if (mediaType === 'audio') {
                user.audioTrack.play();
            }
        });
    }

    getDevices = async () => {
        const [ videoDevices, audioDevices ] = await Promise.all([
            ArRTC.getCameras(),
            ArRTC.getMicrophones(),
        ]);
        this.setState({
            videoDevices,
            audioDevices
        });
    }

    createTrack = async () => {
        this.setState({
            audioTrack: await ArRTC.createMicrophoneAudioTrack()
        });
        if (this.state.videoDevices?.length) {
            this.setState({
                videoTrack: await ArRTC.createCameraVideoTrack()
            });
        }
    }
    
    join = () => {
        const { rtcClient, channel } = this.state;
        const { appid, uid } = Config;

        rtcClient.join(appid, channel, null, uid).then((uid) => {
            this.setState({ isLogin: true }, async () => {
                await this.getDevices();
                await this.createTrack();
                const { videoTrack, audioTrack } = this.state;
                videoTrack && videoTrack.play('local');
                audioTrack && rtcClient.publish(audioTrack);
                videoTrack && rtcClient.publish(videoTrack);
            });
        }).catch(e => {
            alert('加入频道失败');
        });
    }

    channelInputChange = () => {
        this.setState({
            channel: this.channelInput.current.value
        });
    }

    hangUp = () => {
        const { videoTrack, rtcClient } = this.state;
        videoTrack && videoTrack.stop();
        rtcClient.leave();
        this.setState({ 
            channel: '',
            isLogin: false,
            videoDevices: null,
            audioDevices: null,
            audioTrack: null,
            videoTrack: null
        });
    }


    render() {
        const { isLogin, channel, list } = this.state;
        return (
            <div id='container'>
                <div className='title'>
                    <a href="https://www.anyrtc.io/" target='_blank'>anyRTC samples</a> 
                    <span>Peer connection</span>
                </div>
                <div className='instructions'>The local user id is <span className='userId'>{ Config.uid }</span></div>
                <div id='playContainer'>
                    { isLogin && <div id='local'></div> }
                    { isLogin && list.map((user) => {
                        return (<div id={ 'distal' + user.uid } className='distal'></div>)
                    }) }
                </div>
                { isLogin && <button onClick={ this.hangUp } className='btn'>Hang Up</button> }
                { !isLogin && <input type="text" ref={ this.channelInput } onChange={ this.channelInputChange } className='channelInput' placeholder='Please enter the channel'/> }
                { !isLogin && <button onClick={ this.join } disabled={ !channel } className='joinBtn'>join</button> }
                <div className='instructions'>View the console to see logging. The MediaStream object localStream, and the RTCPeerConnection objects pc1 and pc2 are in global scope, so you can inspect them in the console as well.</div>
                <div className='instructions'>For more information about anyRTC WebRTC, see Getting Started With <a href="https://docs.anyrtc.io/cn/Video/api-ref/rtc_web/overview" target='_blank'>anyRTC</a></div>
                <a href="https://github.com/941725931/webRTC_React" id="viewSource" target='_blank'>View source on GitHub</a>
            </div>
        );
    }
}