import React, { useRef, useEffect, useState } from "react";
import { View, Text, Button, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export default function App() {
  const webViewRef = useRef(null);
  const LEVELS = ["free", "medium", "jam"];
  const level_status = {
    free: { color: "#2e7d32", label: "Свободно", speedRange: [50, 60] },
    medium: { color: "#f9a825", label: "Средняя загрузка", speedRange: [25, 50] },
    jam: { color: "#c62828", label: "Пробка", speedRange: [1, 25] },
  };

  const [roads, setRoads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoad, setSelectedRoad] = useState(null);

  useEffect(() => {
    updateRoads();
  }, []);

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getRandomLevel() {
    const idx = Math.floor(Math.random() * 3);
    return LEVELS[idx];
  }

  function getRandomSpeed(level) {
    const range = level_status[level].speedRange;
    const min = range[0];
    const max = range[1];

    return min + Math.floor(Math.random() * (max - min + 1));
  }

  async function loadRoadFromApi(name, osmId) {
    const url ="https://nominatim.openstreetmap.org/lookup?osm_ids=" + osmId + "&format=json";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TrafficMapApp/1.0 EducationalProject",
      },
    });

    const data = await response.json();

    if (data.length === 0) {
      return null;
    }

    const item = data[0];
    const level = getRandomLevel();
    const speedKmh = getRandomSpeed(level);

    return {
      id: osmId,
      name: name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      level: level,
      levelLabel: level_status[level].label,
      color: level_status[level].color,
      speedKmh: speedKmh,
    };
  }

  async function updateRoads() {
    setLoading(true);

    const roadList = [
      { name: "улица Кирова", id: "W138312934" },
      { name: "Московская улица", id: "W217861091" },
      { name: "улица Гагарина", id: "W21580960" },
      { name: "Тарутинская улица", id: "W332106186" },
      { name: "Грабцевское шоссе", id: "W397008085" },
    ];

    const newRoads = [];

    for (let i = 0; i < roadList.length; i++) {
      const road = await loadRoadFromApi(roadList[i].name, roadList[i].id);

      if (road !== null) {
        newRoads.push(road);
      }

      await delay(1000);
    }

    setRoads(newRoads);
    setSelectedRoad(null);

    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.showRoads(${JSON.stringify(newRoads)});
        true;
      `);
    }

    setLoading(false);
  }

  function markerClick(id) {
    const road = roads.find((item) => item.id === id);

    if (road) {
      setSelectedRoad(road);
    }
  }

  const htmlCode = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />

      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      />

      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

      <style>
        html, body, #map {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
        }
      </style>
    </head>

    <body>
      <div id="map"></div>

      <script>
        var map = L.map('map').setView([54.5138, 36.2612], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        var markers = [];

        window.showRoads = function(roads) {
          markers.forEach(function(marker) {
            map.removeLayer(marker);
          });

          markers = [];

          roads.forEach(function(road) {
            var marker = L.circleMarker([road.latitude, road.longitude], {
              color: road.color,
              fillColor: road.color,
              fillOpacity: 0.9,
              radius: 10
            }).addTo(map);

            marker.on('click', function() {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ id: road.id })
              );
            });

            markers.push(marker);
          });

          if (markers.length > 0) {
            var group = L.featureGroup(markers);
            map.fitBounds(group.getBounds(), {
              padding: [40, 40],
              maxZoom: 14
            });
          }
        };
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.mapBlock}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlCode }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
          onMessage={(e) => markerClick(JSON.parse(e.nativeEvent.data).id)}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.title}>Карта загруженности дорог</Text>

        {loading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Button title="Обновить данные" onPress={updateRoads} />
        )}

        {selectedRoad && (
          <View style={styles.details}>
            <Text style={styles.detailsTitle}>{selectedRoad.name}</Text>
            <Text>Состояние: {selectedRoad.levelLabel}</Text>
            <Text>Скорость: {selectedRoad.speedKmh} км/ч</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  mapBlock: {
    flex: 1,
    backgroundColor: "#ddd",
  },

  map: {
    flex: 1,
  },

  panel: {
    padding: 15,
    backgroundColor: "white",
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  info: {
    marginTop: 10,
    fontSize: 14,
  },

  details: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
  },

  detailsTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
});