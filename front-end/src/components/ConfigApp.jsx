import React from "react";
import {SyncLoader} from "react-spinners";
import * as _ from "underscore";

export default class ConfigApp extends React.Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      configData: null,
      error: null,
      loading: true,
    };
    this.twitch = window.Twitch ? window.Twitch.ext : null;
    this.onAskAuth = this.onAskAuth.bind(this);
    this.onSplitPacksChange = this.onSplitPacksChange.bind(this);
    this.onSubmitConfig = this.onSubmitConfig.bind(this);
  }

  componentDidMount() {
    if (this.twitch) {
      this.twitch.onAuthorized((auth) => {
        this.auth = auth;
        this.loadConfig();
      });
      //this.twitch.onContext((context,delta)=>{
      //this.contextUpdate(context,delta)
      //});
    }
  }

  loadConfig() {
    this.setState({
      loading: true,
    });
    fetch('https://455ngs5mgk.execute-api.us-east-2.amazonaws.com/config-get', {
      method: 'GET',
      headers: {
        authorization: 'Bearer ' + this.auth.token
      }
    }).then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        res.text().then((error) => {
          throw new Error(error);
        });
      }
    }).then((configData) => {
      this.setState({
        configData: configData,
        loading: false,
      });
    }).catch((error) => {
      this.setState({
        error: error.message,
        loading: false,
      });
    });
  }

  saveConfig() {
    this.setState({
      loading: true,
    });
    const { configData } = this.state;
    fetch('https://455ngs5mgk.execute-api.us-east-2.amazonaws.com/config-put', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + this.auth.token
      },
      body: JSON.stringify({
        splitPacks: configData.splitPacks,
      }),
    }).then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        res.text().then((error) => {
          throw new Error(error);
        });
      }
    }).then((configData) => {
      this.setState({
        configData: configData,
        loading: false,
      });
    }).catch((error) => {
      this.setState({
        error: error.message,
        loading: false,
      });
    });
  }

  onAskAuth() {
    const scope = encodeURIComponent('channel:manage:redemptions');
    const redirectUri = 'https://455ngs5mgk.execute-api.us-east-2.amazonaws.com/twitch-oauth-register';
    const clientId = '3f3zyq04l5wxb7m1xhfmwnpj2bbfun';
    const oAuthURL = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    const win = window.open(oAuthURL, 'twitch authorization', 'width=972,height=660,modal=yes,alwaysRaised=yes');
    const checkConnect = setInterval(() => {
      if (!win || !win.closed) return;
      clearInterval(checkConnect);
      this.loadConfig();
    }, 100);
  }

  onSplitPacksChange(event) {
    const {configData} = this.state;
    if (configData) {
      configData.splitPacks = event.target.value;
      this.setState({
        configData: configData,
      });
    }
  }

  onSubmitConfig(){
    this.saveConfig();
  }

  render() {
    const {configData, error, loading} = this.state;
    if (loading){
      return <SyncLoader color="#36d7b7"/>;
    }
    return (
      <div>
        {(error) ?
          <div>{error}</div> :
          (configData) ?
            (configData.requireAuth) ?
              <div>
                <button type="button" onClick={this.onAskAuth}>Get twitch authorization</button>
              </div> :
              <div>
                <div onChange={this.onSplitPacksChange}>
                  <input type="radio" value={false} checked={!configData.splitPacks} name="splitPacks"/> create 1
                  channel reward (for all packs)
                  <input type="radio" value={true} checked={configData.splitPacks} name="splitPacks"/> create 3 channel
                  reward (1 for each packs)
                </div>
                {
                  (configData.rewards)?
                    <p>Created rewards</p>: null
                }
                <div className="rewards-center-body">
                  <div className="rewards-list">
                    {
                      (configData.rewards) ?
                        _.map(configData.rewards, (reward) => {
                          return (<div className="reward-list-item">
                            <div className="reward-list-item-content">
                              <div className="reward-visual">
                                <div className="reward-visual-content"
                                     style={{backgroundColor: reward.background_color}}>
                                  <div className="reward-visual-image">
                                    <div className="reward-visual-image-content">
                                      <img className="reward-image" src={(reward.image) ?
                                        reward.image.url_2x : reward.default_image.url_2x}/>
                                    </div>
                                  </div>
                                  <div className="reward-visual-cost">
                                    <p className="reward-visual-cost-label">
                                      {reward.cost}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="reward-title">
                                <p className="reward-title-label">
                                  {reward.title}
                                </p>
                              </div>
                            </div>
                          </div>);
                        }) : null
                    }
                  </div>
                </div>
                <div>
                  <button type="button" onClick={this.onSubmitConfig}>Create/update sticker rewards</button>
                  <p>After the rewards are created by the extension, you can then edit them in the reward manager to modify their images, title or costs.</p>
                  <p>If any of those rewards are deleted or seems to no longer work, you can come back to this configuration page and click on the button again to recreate the missing rewards.</p>
                </div>
              </div> : null
        }
      </div>
    );
  }
}