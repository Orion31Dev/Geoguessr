import React from 'react';
import './App.css';
import { MapContainer } from './maps/MapContainer';
import { StreetViewContainer } from './maps/StreetViewContainer';
import { isoA3ToA2 } from './CountryCodes';

require('dotenv').config();

const ROUND_NUM = 5;

interface AppState {
  correct: boolean;
  guessed: boolean;
  country: string;
  countryCode: string;

  rounds: boolean[];
}

class App extends React.Component<any, AppState> {
  nv: any;
  map: any;
  constructor(props: any) {
    super(props);

    this.state = {
      correct: false,
      guessed: false,
      country: '',
      countryCode: '',
      rounds: [],
    };

    this.nv = React.createRef();
    this.map = React.createRef();
  }

  render() {
    return (
      <div className="App">
        {this.state.rounds.length < ROUND_NUM ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
            <MapContainer
              center={{ lat: 45, lng: 45 }}
              zoom={0}
              guessCallback={this.guess.bind(this)}
              ref={this.map}
              key={this.state.rounds.length}
            ></MapContainer>
            <StreetViewContainer
              center={{ lat: 41.157398, lng: -73.356401 }}
              zoom={0}
              doneCallback={this.streetViewDone.bind(this)}
              key={this.state.rounds.length + 1}
            ></StreetViewContainer>
          </div>
        ) : (
          this.renderResults()
        )}
        <div className="header">
          <div className="title">GeoGuessr Pro Max+</div>
          <div className="bubbles">{this.renderBubbles()}</div>
        </div>
        {this.renderRoundResultBox()}
        {this.state.guessed && (
          <div className="btn-next-round" onClick={this.nextRound.bind(this)}>
            {this.state.rounds.length < ROUND_NUM ? 'Next Round' : 'Results'}
          </div>
        )}
        <div className="version-number">v0.0.1INDEV-001</div>
      </div>
    );
  }

  renderResults() {
    console.log(this.state.rounds);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignContent: 'center', flexWrap: 'wrap', height: '100%', width: '100%' }}>
        <div className="result-percent">
          {Math.floor(
            (this.state.rounds.filter((b) => {
              return b;
            }).length /
              this.state.rounds.length) *
              100
          )}
          %
        </div>
        <div className="result-lbl">Correct</div>
      </div>
    );
  }

  renderRoundResultBox() {
    if (!this.state.guessed) return;

    if (this.state.correct)
      return (
        <div className="round-result-container">
          <div className="round-result correct">
            <div className="round-result-header correct">CORRECT</div>
          </div>
        </div>
      );

    return (
      <div className="round-result-container">
        <div className="round-result incorrect">
          <div className="round-result-header incorrect">INCORRECT</div>
          <div className="round-result-desc">It was {this.state.country}</div>
        </div>
      </div>
    );
  }

  renderBubbles() {
    let arr = [];
    for (let i = 0; i < ROUND_NUM; i++) {
      let className = '';
      if (this.state.rounds[i] !== undefined) className = this.state.rounds[i] ? 'right' : 'wrong';

      arr.push(<div key={i} className={'round-bubble ' + className}></div>);
    }
    return arr;
  }

  nextRound() {
    this.setState({ correct: false, guessed: false, country: '', countryCode: '' });

    if (this.state.rounds.length >= ROUND_NUM) return;
    this.setState({rounds: [...this.state.rounds, this.state.correct]});
  }

  guess(guess: string) {
    if (this.state.guessed) return;

    let correct = this.state.countryCode === isoA3ToA2(guess);

    this.setState({ guessed: true, correct: correct });

    if (this.state.rounds.length === ROUND_NUM - 1) this.setState({ rounds: [...this.state.rounds, correct] });
  }

  streetViewDone(country: string, countryCode: string) {
    this.setState({ country: country, countryCode: countryCode });
  }
}

export default App;
