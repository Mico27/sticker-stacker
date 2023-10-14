import React from "react";
import {SyncLoader} from "react-spinners";

export default class ConfigApp extends React.Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      configData: null,
      error: null,
    };
    this.twitch = window.Twitch ? window.Twitch.ext : null;
    this.onAskAuth = this.onAskAuth.bind(this);
  }

  componentDidMount() {
    if (this.twitch){
      this.twitch.onAuthorized((auth)=>{
        this.auth = auth;
        this.loadConfig();
      });
      //this.twitch.onContext((context,delta)=>{
        //this.contextUpdate(context,delta)
      //});
    }
  }

  loadConfig(){
    fetch('https://localhost/config-get', {
      method: 'GET',
      headers: {
        authorization: 'Bearer ' + this.auth.token
      }
    }).then((res)=>{
      if (res.ok){
        return res.json();
      } else {
        res.text().then((error)=>{
          throw new Error(error);
        });
      }
    }).then((configData)=>{
      this.setState({
        configData: configData
      });
    }).catch((error)=>{
      this.setState({
        error: error,
      });
    });
  }

  onAskAuth(){
    const scope = encodeURIComponent('channel:manage:redemptions');
    const redirectUri = 'https://localhost/twitch-oauth-register';
    const clientId = '3f3zyq04l5wxb7m1xhfmwnpj2bbfun';
    const oAuthURL = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    const win = window.open(oAuthURL, 'twitch authorization', 'width=972,height=660,modal=yes,alwaysRaised=yes');
    const checkConnect = setInterval(() => {
      if (!win || !win.closed) return;
      clearInterval(checkConnect);
      this.loadConfig();
    }, 100);
  }

  render() {
    const {configData, error} = this.state;
    return (
      <div>
        {(error)?
          <div>{error}</div>:
          (!configData)?
          <SyncLoader color="#36d7b7" />:
          (configData.requireAuth) ?
            <div>
              <button type="button" onClick={this.onAskAuth}>Get twitch authorization</button>
            </div> :
          <div>
            Connected
          </div>
        }
      </div>
    );
  }
}