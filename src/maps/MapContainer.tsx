import React from 'react';
import GoogleMapReact from 'google-map-react';

require('dotenv').config();

interface MapContainerProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
}

export class MapContainer extends React.Component<MapContainerProps> {
  render() {
    return (
      <div style={{ position: 'absolute', bottom: '2.5vh', right: '2.5vw', height: '30vh', width: '25%', zIndex: 10 }}>
        <GoogleMapReact
          bootstrapURLKeys={{ key: process.env.REACT_APP_API_KEY as string }}
          defaultCenter={this.props.center}
          defaultZoom={this.props.zoom}
          onGoogleApiLoaded={({ map, maps }) => this.drawMap(map, maps)}
        >
        </GoogleMapReact>
      </div>
    );
  }

  drawMap(map: any, maps: any) {
    var rows = map.data['rows'];
    console.log(map.data);
    for (var i in rows) {
      if (rows[i][0] !== 'Antarctica') {
        var newCoordinates = [];
        var geometries = rows[i][1]['geometries'];
        if (geometries) {
          for (var j in geometries) {
            newCoordinates.push(this.constructNewCoordinates(maps, geometries[j]));
          }
        } else {
          newCoordinates = this.constructNewCoordinates(maps, rows[i][1]['geometry']);
        }
        var country = new maps.Polygon({
          paths: newCoordinates,
          strokeColor: '#ff9900',
          strokeOpacity: 1,
          strokeWeight: 0.3,
          fillColor: '#ffff66',
          fillOpacity: 0,
          name: rows[i][0]
        });

        maps.event.addListener(country, 'mouseover', function() {
          country.setOptions({fillOpacity: 0.4});
        });

        maps.event.addListener(country, 'mouseout', function() {
          country.setOptions({fillOpacity: 0});
        });

        maps.event.addListener(country, 'click', function() {
          alert(country.name);
        });
  
        country.setMap(map);
      }
    }
  }
  
  constructNewCoordinates(maps: any, polygon: any) {
    var newCoordinates = [];
    var coordinates = polygon['coordinates'][0];
    for (var i in coordinates) {
      newCoordinates.push(
          new maps.LatLng(coordinates[i][1], coordinates[i][0]));
    }
    return newCoordinates;
  }
}

