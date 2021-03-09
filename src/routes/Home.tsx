import React from 'react';

export default class Home extends React.Component<any, any> {
  render() {
    return (
      <div className="App">
        <div className="header">
          <div className="title">GeoGuessr Pro Max+</div>
        </div>
        <div className="watermark">Created by Ryan Salik</div>
        <div className="play">
          <a href="/countries">
            <div className="gamemode-wrapper">
              <div className="gamemode">
                <div className="gamemode-lbl">COUNTRIES</div>
                <div className="img-countries gamemode-img"></div>
              </div>
            </div>
          </a>
          <div className="gamemode-wrapper">
            <div className="gamemode">
              <div className="gamemode-lbl">BATTLE ROYALE</div>
              <div className="img-battle-royale gamemode-img"></div>
              <div className="wip">WORK IN PROGRESS</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
