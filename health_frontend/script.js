document.addEventListener("DOMContentLoaded", function () {
  const heartRateLabel = document.getElementById("heartRateLabel");
  const tempLabel = document.getElementById("tempLabel");
  const recommendationText = document.getElementById("recommendationText");

  

  // Define the base URL for your API
  const BASE_URL = 'http://localhost:9000'; // Change if your backend is on a different port or host

  const heartRateChartDay = initializeHistoricalChart("heartRateChartDay", "Heart Rate", 0, 200);
  const temperatureChartDay = initializeHistoricalChart("temperatureChartDay", "Temperature", 0, 40);
  const stepsChartDay = initializeHistoricalChart("stepsChartDay", "Steps", 0, 2000);

  const heartRateChartWeek = initializeHistoricalChart("heartRateChartWeek", "Heart Rate", 0, 200, 'day');
  const temperatureChartWeek = initializeHistoricalChart("temperatureChartWeek", "Temperature", 0, 40, 'day');
  const stepsChartWeek = initializeHistoricalChart("stepsChartWeek", "Steps", 0, 2000, 'day');

  updateCharts();

  // Placeholder for gauge instances
  let heartRateGauge, bodyTempGauge, stepsGauge;

  // Fetch and update data from backend
  function fetchAndUpdateData() {
    fetch(`${BASE_URL}/latest-heart-rate`)
      .then(response => response.json())
      .then(data => {
        const heartrate = data.heartrate;
        //heartRateLabel.innerText = `${heartrate}`;
        updateheartRateGauge(heartrate);
      })
      .catch(error => console.error('Error fetching heart rate:', error));

    fetch(`${BASE_URL}/latest-temperature`)
      .then(response => response.json())
      .then(data => {
        const temperature = data.bodytemp;
        //tempLabel.innerText = `${temperature} °C`;
        updatebodyTempGauge(temperature);
      })
      .catch(error => console.error('Error fetching temperature:', error));

      fetch(`${BASE_URL}/today-steps`)
      .then(response => response.json())
      .then(data => {
        const steps = data.totalsteps;
        const stepsPercentage = (steps / 10000) * 100; // Convert steps to percentage of 10000 step goal
        updateStepsGauge(steps); // Update the gauge with the percentage
      })
      .catch(error => console.error('Error fetching steps:', error));
  }

  heartRateGauge = generateheartRateGauge('#heartRateGauge', 'heartRate', 200);
  bodyTempGauge = generatebodyTempGauge('#bodyTempGauge', 'bodyTemp', 44);
  stepsGauge = generateStepsGauge('#stepsGauge', 'Steps', 10000);

  function generateheartRateGauge(canvasId, label, max) {
    return c3.generate({
      bindto: canvasId,
      data: {
        columns: [
          [label, 0] 
        ],
        type: 'gauge'
      },
      gauge: {
        max: max,
        label: {
          format: function(value, ratio) {
            return value; 
          }
        },
      },
      color: {
        pattern: ['#ff0000'], 
      },
      size: {
        height: 180
      }
    });
  }

  function generatebodyTempGauge(canvasId, label, max) {
    return c3.generate({
      bindto: canvasId,
      data: {
        columns: [
          [label, 0] 
        ],
        type: 'gauge'
      },
      gauge: {
        max: max,
        label: {
          format: function(value, ratio) {
            return value; 
          }
        },
      },
      color: {
        pattern: ['#0000ff'], 
      },
      size: {
        height: 180
      }
    });
  }

  

  function generateStepsGauge(canvasId, label, max) {
    return c3.generate({
      bindto: canvasId,
      data: {
        columns: [
          [label, 0] 
        ],
        type: 'gauge'
      },
      gauge: {
        max: max,
        label: {
          format: function(value, ratio) {
            return value; 
          }
        },
      },
      color: {
        pattern: ['#60B044'], 
      },
      size: {
        height: 180
      }
    });
  }

  function updateStepsGauge(newValue) {
    stepsGauge.load({
      columns: [['Steps', newValue]]
    });
  }

  function updateheartRateGauge(newValue) {
    heartRateGauge.load({
      columns: [['heartRate', newValue]]
    });
  }

  function updatebodyTempGauge(newValue) {
    bodyTempGauge.load({
      columns: [['bodyTemp', newValue]]
    });
  }

  
  fetchAndUpdateData();
  setInterval(fetchAndUpdateData, 60000);

  function fetchRecommendations() {
    fetch(`${BASE_URL}/get-recommendations`)
      .then(response => response.json())
      .then(data => {
        recommendationText.innerText = data.recommendation;
      })
      .catch(error => {
        console.error('Failed to fetch recommendations:', error);
        recommendationText.innerText = "Failed to fetch new recommendations.";
      });
  }

  fetchRecommendations();
  setInterval(fetchRecommendations, 600000);


  function updateCharts() {
    fetch(`${BASE_URL}/daily-data`)
        .then(response => response.json())
        .then(data => {
            console.log("Daily Data Received:", data);  // Debugging log
            const heartRates = data.map(item => ({ x: new Date(item.hour), y: parseFloat(item.avgheartrate) }));
            const temperatures = data.map(item => ({ x: new Date(item.hour), y: parseFloat(item.avgtemp) }));
            const steps = data.map(item => ({ x: new Date(item.hour), y: parseFloat(item.totalsteps) }));
            updateHistoricalData(heartRateChartDay, heartRates, 'Heart Rate over the last 24 hours');
            updateHistoricalData(temperatureChartDay, temperatures, 'Temperature over the last 24 hours');
            updateHistoricalData(stepsChartDay, steps, 'Steps over the last 24 hours');
        })
        .catch(error => console.error('Error fetching daily data:', error));

    fetch(`${BASE_URL}/weekly-data`)
        .then(response => response.json())
        .then(data => {
            console.log("Weekly Data Received:", data);  // Debugging log
            const heartRates = data.map(item => ({ x: new Date(item.day), y: parseFloat(item.avgheartrate) }));
            const temperatures = data.map(item => ({ x: new Date(item.day), y: parseFloat(item.avgtemp) }));
            const steps = data.map(item => ({ x: new Date(item.day), y: parseFloat(item.totalsteps) }));
            updateHistoricalData(heartRateChartWeek, heartRates, 'Heart Rate over the last week', 'day');
            updateHistoricalData(temperatureChartWeek, temperatures, 'Temperature over the last week', 'day');
            updateHistoricalData(stepsChartWeek, steps, 'Steps over the last week', 'day');
        })
        .catch(error => console.error('Error fetching weekly data:', error));
}

function updateAllCharts() {
  updateCharts(); 
}

setInterval(updateAllCharts, 600000);

function updateHistoricalData(chart, data, label) {
  const maxDataValue = Math.max(...data.map(d => d.y)) + 10; // Add a margin
  chart.options.scales.y.suggestedMax = maxDataValue;

  chart.data.labels = data.map(d => d.x);
  chart.data.datasets.forEach((dataset) => {
      dataset.data = data;
      dataset.label = label;
  });
  chart.update();
}


function initializeHistoricalChart(canvasId, label, min, max, timeUnit) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
      type: 'line',
      data: {
          labels: [],
          datasets: [{
              label: label,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1,
              fill: false,
              data: []
          }],
      },
      options: {
          scales: {
              x: {
                  type: 'time',
                  time: {
                      unit: timeUnit,
                      displayFormats: {
                          'millisecond': 'h:mm a',
                          'second': 'h:mm a',
                          'minute': 'h:mm a',
                          'hour': 'h:mm a',
                          'day': 'h:mm a',
                          'week': 'h:mm a',
                          'month': 'h:mm a',
                          'quarter': 'h:mm a',
                          'year': 'h:mm a',
                      },
                      tooltipFormat: 'MMM D, h:mm a'
                  },
                  title: {
                      display: true,
                      text: 'Time'
                  }
              },
              y: {
                  beginAtZero: false,
                  suggestedMin: min,
                  suggestedMax: max,
                  title: {
                      display: true,
                      text: label
                  },
                  ticks: {
                      callback: function(value) {
                          return value;
                      }
                  }
              },
          },
          plugins: {
              tooltip: {
                  enabled: true,
                  mode: 'index',
                  intersect: false,
                  callbacks: {
                      label: function(tooltipItem, data) {
                          let label = data.datasets[tooltipItem.datasetIndex].label || '';
                          if (label) {
                              label += ': ';
                          }
                          label += parseFloat(tooltipItem.parsed.y).toFixed(2);
                          return label;
                      }
                  }
              },
              legend: {
                  position: 'top',
              },
              title: {
                  display: true,
                  text: label,
                  align: 'center'
              }
          },
          responsive: true,
          maintainAspectRatio: false,
      }
  });
}


});
