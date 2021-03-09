import React from 'react';
import GoogleMapReact from 'google-map-react';
require('dotenv').config();

interface StreetViewContainerProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;

  doneCallback: Function;
}

interface StreetViewContainerState {
}

export class StreetViewContainer extends React.Component<StreetViewContainerProps, StreetViewContainerState> {
  panorama: any;
  usedLocs: { lat: number; lng: number }[];

  constructor(props: StreetViewContainerProps) {
    super(props);
    this.panorama = React.createRef();
    this.usedLocs = [];

  }


  render() {
    return (
      <div id={'map'} style={{ height: '99vh', width: '99.5%' }}>
        <GoogleMapReact
          bootstrapURLKeys={{ key: process.env.REACT_APP_API_KEY as string }}
          defaultCenter={this.props.center}
          defaultZoom={this.props.zoom}
          ref={this.panorama}
          onGoogleApiLoaded={({ map, maps }) => this.apiIsLoaded(map, maps)}
          yesIWantToUseGoogleMapApiInternals
        ></GoogleMapReact>
      </div>
    );
  }

  apiIsLoaded = async (_map: any, maps: any) => {
    let sv = new maps.StreetViewService();
    let panorama = new maps.StreetViewPanorama(document.getElementById('map'));

    let loc = this.getRandomLatLng();

    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.lat},${loc.lng}&key=${process.env.REACT_APP_API_KEY}`)
      .then((res) => res.json())
      .then((data: any) => {
        data.results.forEach((obj: any) => {
          if (obj.types.includes('country')) {
            this.props.doneCallback(obj.formatted_address, obj.address_components[0].short_name);
          }
        });
      });

    sv.getPanorama({ location: loc, radius: 100 }, (data: any, _status: any) => {
      panorama.setPano(data.location.pano);
      panorama.setPov({
        heading: 270,
        pitch: 0,
      });
      panorama.setVisible(true);
      panorama.setOptions({
        showRoadLabels: false,
        disableDefaultUI: true,
      });
    });
  };

  getRandomLatLng() {
    let l;

    do l = locations[Math.floor(randomRange(0, locations.length))];
    while (this.usedLocs.includes(l));

    this.usedLocs.push(l);
    return l;
  }
}

const locations = [
  { lat: 64.9296689, lng: -147.629437 },
  { lat: -12.9594884, lng: -38.483756 },
  { lat: -17.7832528, lng: -63.1891003 },
  { lat: -25.2959187, lng: -57.5798229 },
  { lat: -33.4369638, lng: -70.6583966 },
  { lat: -33.4369638, lng: -70.6583966 },
  { lat: -35.1746662, lng: -58.2285172 },
  { lat: 49.9102813, lng: -97.1710041 },
];

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
