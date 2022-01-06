import React from 'react';
import GoogleMapReact from 'google-map-react';

import geoJSON from '../countries.json';

interface MapContainerProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;

  block: string[];

  right: string;

  guessCallback: (guess: string) => void;
}

interface MapContainerState {
  activePoly: any | undefined;

  polys: any[];
  map: any;
}

export class MapContainer extends React.Component<MapContainerProps, MapContainerState> {
  constructor(props: MapContainerProps) {
    super(props);

    this.state = {
      activePoly: undefined,
      polys: [],
      map: undefined,
    };
  }

  render() {
    return (
      <div style={{ position: 'absolute', right: this.props.right, bottom: '3.5vh', zIndex: 100 }} className={'map-container'}>
        <div className={'map'}>
          <GoogleMapReact
            bootstrapURLKeys={{
              key: process.env.REACT_APP_API_KEY as string,
            }}
            defaultCenter={this.props.center}
            defaultZoom={this.props.zoom}
            onGoogleApiLoaded={({ map, maps }) => this.drawMap(map, maps)}
            yesIWantToUseGoogleMapApiInternals
          ></GoogleMapReact>
        </div>
        <div className={'selected-country' + (this.state.activePoly ? ' active' : '')} onClick={this.guess.bind(this)}>
          {this.state.activePoly ? this.state.activePoly.h.ADMIN : 'Select a country'}
        </div>
      </div>
    );
  }

  updateBlockedCountries() {
    this.state.polys.forEach((f) => {
      if (this.props.block.includes(f.h.ISO_A3)) {
        this.state.map?.data.overrideStyle(f, {
          fillColor: '#ff0000',
          strokeColor: '#ff0000',
          strokeWeight: 1,
          strokeOpacity: 1,
          fillOpacity: 0.3,
        });
      }
    });
  }

  resetSelected() {
    this.state.map.data.overrideStyle(this.state.activePoly, {
      strokeOpacity: 0,
      fillOpacity: 0,
    });

    this.setState({ activePoly: undefined });
  }

  drawMap(map: any, maps: any) {
    this.setState({ polys: map.data.addGeoJson(geoJSON), map: map });

    maps.event.trigger(map, 'resize');

    map.data.setStyle({
      fillColor: '#df00ff',
      strokeColor: '#af00ff',
      strokeWeight: 1,
      strokeOpacity: 0,
      fillOpacity: 0,
    });

    map.setOptions({
      disableDefaultUI: true,
      mapTypeId: maps.MapTypeId.ROADMAP,
    });

    map.data.addListener('click', (event: any) => {
      if (this.props.block.includes(event.feature.h.ISO_A3)) return;
      map.data.overrideStyle(event.feature, {
        fillOpacity: 0.3,
        strokeOpacity: 1,
      });

      if (this.state.activePoly) {
        map.data.overrideStyle(this.state.activePoly, {
          strokeOpacity: 0,
          fillOpacity: 0,
        });
      }

      this.setState({ activePoly: event.feature });
    });
  }

  guess() {
    if (this.state.activePoly) this.props.guessCallback(this.state.activePoly.h.ISO_A3);
  }
}
