import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';

import './App.css';
import Home from './routes/Home';
import SoloCountries from './routes/SoloCountries';

function App() {
  return (
    <div>
      <div className="version-number">v0.0.1INDEV-{process.env.REACT_APP_BUILD_NUM}</div>
      <BrowserRouter>
        <Switch>
          <Route exact path={'/'}>
            <Home></Home>
          </Route>
          <Route exact path={'/countries'} component={SoloCountries} />
        </Switch>
      </BrowserRouter>
    </div>
  );
}

export default App;
