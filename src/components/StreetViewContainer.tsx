import React from 'react';
import GoogleMapReact from 'google-map-react';

interface StreetViewContainerProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;

  doneCallback: Function;

  loc: { lat: number; lng: number };
}

interface StreetViewContainerState {}

export class StreetViewContainer extends React.Component<StreetViewContainerProps, StreetViewContainerState> {
  panorama: any;

  constructor(props: StreetViewContainerProps) {
    super(props);
    this.panorama = React.createRef();
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

    let loc: { lat: number; lng: number };

    loc = this.props.loc;

    console.log('If the game crashed, please report this number to Ryan: ' + loc.lng);

    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.lat},${loc.lng}&key=${process.env.REACT_APP_API_KEY}`)
      .then((res) => res.json())
      .then((data: any) => {
        data.results.forEach((obj: any) => {
          if (obj.types.includes('country')) {
            this.props.doneCallback(obj.formatted_address, obj.address_components[0].short_name, loc);
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
}
