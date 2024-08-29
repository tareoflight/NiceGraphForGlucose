document.getElementById('csvFileInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    Papa.parse(file, {
        header: true,
        complete: function(results) {
            const data = results.data;
            renderChart(data);
        }
    });
});

function renderChart(data) {
    const timestamps = data.map(row => row['Device Timestamp']);
    const glucoseLevels = data.map(row => parseFloat(row['Historic Glucose mmol/L']));
    const carbs = data.map(row => parseFloat(row['Carbohydrates (grams)'] || 0));
    const insulin = data.map(row => parseFloat(row['Long-Acting Insulin (units)'] || 0));

    const ctx = document.getElementById('glucoseChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [
                {
                    label: 'Glucose mmol/L',
                    data: glucoseLevels,
                    borderColor: 'blue',
                    yAxisID: 'y1',
                    fill: false,
                },
                {
                    label: 'Carbohydrates grams',
                    data: carbs,
                    type: 'bar',
                    backgroundColor: 'orange',
                    yAxisID: 'y2'
                },
                {
                    label: 'Long-Acting Insulin units',
                    data: insulin,
                    type: 'scatter',
                    backgroundColor: 'green',
                    yAxisID: 'y2',
                }
            ]
        },
        options: {
            scales: {
                y1: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Glucose mmol/L'
                    }
                },
                y2: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Carbohydrates & Insulin'
                    }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        tooltipFormat: 'MMM DD, YYYY HH:mm',
                        displayFormats: {
                            hour: 'HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
            }
        }
    });
}