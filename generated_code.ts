import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { CircularProgress, Container, Typography } from '@mui/material';
import { data } from './data';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface User {
  Index: number;
  'User Id': string;
  'First Name': string;
  'Last Name': string;
  Sex: string;
  Email: string;
  Phone: string;
  'Date of birth': string;
  'Job Title': string;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    if (data?.length) {
      const maleCount = data.filter((user: User) => user.Sex === 'Male').length;
      const femaleCount = data.filter((user: User) => user.Sex === 'Female').length;

      setChartData({
        labels: ['Male', 'Female'],
        datasets: [
          {
            label: 'Gender Distribution',
            data: [maleCount, femaleCount],
            backgroundColor: ['#4A90E2', '#E94E77'],
          },
        ],
      });
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Container style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!chartData) {
    return (
      <Container style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212' }}>
        <Typography variant="h6" style={{ color: '#fff' }}>
          No data available
        </Typography>
      </Container>
    );
  }

  return (
    <Container style={{ backgroundColor: '#121212', padding: '20px', minHeight: '100vh' }}>
      <Typography variant="h4" style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>
        User Gender Distribution
      </Typography>
      <Bar
        data={chartData}
        options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#fff',
              },
            },
            title: {
              display: true,
              text: 'Gender Distribution Chart',
              color: '#fff',
            },
          },
          scales: {
            x: {
              ticks: {
                color: '#fff',
              },
            },
            y: {
              ticks: {
                color: '#fff',
              },
            },
          },
        }}
      />
    </Container>
  );
}