import { useRef, useEffect, useState,memo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { SensorData } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ChartComponentProps {
    data: SensorData[];
    labels: string[];
    selectedVariable: keyof SensorData | '';
}

const ChartComponent = memo<ChartComponentProps>(({ data, labels, selectedVariable }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (!chartContainerRef.current) return;
            const scrollableContainer = chartContainerRef.current.parentElement;
            if (!scrollableContainer) return;

            // Check if the user has scrolled away from the end
            const isScrolledToEnd = scrollableContainer.scrollWidth - scrollableContainer.scrollLeft === scrollableContainer.clientWidth;
            setIsAutoScrollPaused(!isScrolledToEnd);
        };

        const scrollableContainer = chartContainerRef.current?.parentElement;
        scrollableContainer?.addEventListener('scroll', handleScroll);

        return () => scrollableContainer?.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (chartContainerRef.current) {
            // Dynamically calculate width per data point based on the number of points and viewport width
            const baseWidthPerPoint = 50; // Minimum width per data point in pixels
            const screenWidthFactor = Math.max(window.innerWidth / data.length, baseWidthPerPoint);
            const dynamicWidth = Math.max(screenWidthFactor, baseWidthPerPoint) * data.length;
            chartContainerRef.current.style.minWidth = `${dynamicWidth}px`;

            // Auto-scroll to the last point if auto-scroll is not paused
            if (!isAutoScrollPaused) {
                const scrollableContainer = chartContainerRef.current.parentElement;
                if (scrollableContainer) {
                    const scrollPosition = chartContainerRef.current.offsetWidth - scrollableContainer.offsetWidth;
                    scrollableContainer.scrollLeft = scrollPosition;
                }
            }
        }
    }, [data.length, isAutoScrollPaused]);

    const chartData = {
        labels,
        datasets: selectedVariable ? [{
            label: selectedVariable,
            data: data.map(d => d[selectedVariable]),
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
        }] : [],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0  // disables animations globally
        }
    };

    return (
        <div className='fullscreen-container'>
            <div ref={chartContainerRef} className='chart-container'>
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
});

export default ChartComponent;
