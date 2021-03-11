import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';

import './App.css';
import Home from './routes/Home';
import SoloCountries from './routes/SoloCountries';
import BattleRoyale from './routes/BattleRoyale';
import BattleRoyaleLanding from './routes/BattleRoyaleLanding';

function App() {
  return (
    <div>
      <div className="version-number">
        v{process.env.REACT_APP_VERSION}-{process.env.REACT_APP_BUILD_NUM}
      </div>
      <BrowserRouter>
        <Switch>
          <Route exact path={'/'}>
            <Home></Home>
          </Route>
          <Route exact path={'/countries'} component={SoloCountries} />
          <Route exact path={'/br'} component={BattleRoyaleLanding} />
          <Route exact path={'/br/:room'} component={BattleRoyale} />
        </Switch>
      </BrowserRouter>
    </div>
  );
}

export default App;
