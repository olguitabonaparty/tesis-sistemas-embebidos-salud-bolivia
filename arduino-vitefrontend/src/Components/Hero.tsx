import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import ChartComponent from "./ChartComponent";
import { SensorData } from '../types'; // Importa el tipo

// Define explícitamente los tipos para las variables
interface Variable {
    id: number;
    name: string;
    unit: string;
    key: keyof SensorData;
}

const variables: Variable[] = [
    { id: 0, name: "Temperatura Ambiente", unit: '°C', key: "Temp_Ambiente" },
    { id: 1, name: "Humedad", unit: '%', key: "Humedad" },
    { id: 2, name: "Temperatura Corporal", unit: '°C', key: "Corporal" },
    { id: 3, name: "Latidos por minuto", unit: 'Lpm', key: "BMP" },
    { id: 4, name: "Nivel de oxigeno", unit: '%', key: "SpO2" },
    { id: 5, name: "Angulo Superior", unit: '°', key: "Angulo_superior" },
    { id: 6, name: "Angulo Inferior", unit: '°', key: "Angulo_inferior" },
    { id: 7, name: "Iluminación", unit: 'lm', key:"Iluminacion"}
];

const socket = io('http://localhost:3000');

export default function Hero() {
    const maxDataPoints = 20; // maximum data points to display
    const [data, setData] = useState<{ data: SensorData; timestamp: number }[]>([]);
    const [labels, setLabels] = useState<string[]>([]);
    const [selectedVariable, setSelectedVariable] = useState<keyof SensorData | ''>('');
    const [patientName, setPatientName] = useState<string>('Nombre del Paciente');
    const [isEditingName, setIsEditingName] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        socket.on('serialData', (incomingData) => {
            const parsedData: SensorData = JSON.parse(incomingData);
            const timestamp = Date.now();
            setData(prevData => [...prevData.slice(-(maxDataPoints - 1)), { data: parsedData, timestamp }]);
            setLabels(prevLabels => [...prevLabels.slice(-(maxDataPoints - 1)), new Date().toLocaleTimeString()]);
        });

        return () => {
            socket.off('serialData');
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            const shouldPlaySound = variables.some(variable => {
                const averageValue = calculateAverage(variable.key);
                return averageValue !== null && isOutOfRange(variable.key, averageValue);
            });

            if (shouldPlaySound) {
                audioRef.current.play();
            }
        }
    }, [data]);

    const handleButtonClick = (variableKey: keyof SensorData) => {
        setSelectedVariable(variableKey);
    };

    const handleNameSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setIsEditingName(false);
        }
    };

    const calculateAverage = (key: keyof SensorData): number | null => {
        const oneMinuteAgo = Date.now() - 60000;
        const filteredData = data.filter(d => d.timestamp >= oneMinuteAgo);
        if (filteredData.length === 0) return null;

        const sum = filteredData.reduce((acc, curr) => acc + curr.data[key], 0);
        return sum / filteredData.length;
    };

    const isOutOfRange = (key: keyof SensorData, value: number): boolean => {
        if (key === "BMP") return value < 60 || value > 100;
        if (key === "Corporal") return value < 36.1 || value > 37.2;
        if (key === "SpO2") return value < 95 || value > 100;
        return false;
    };


    const latestData = data.length > 0 ? data[data.length - 1].data : null;
    const selectedVariableInfo = variables.find(v => v.key === selectedVariable);

    return (
        <main className='flex justify-between h-screen w-screen font-roboto'>
            <audio ref={audioRef} src="/sounds/sonidoAlerta.mp3" />
            <div className='flex flex-col items-center w-1/4'>
                {isEditingName ? (
                    <input
                        className='font-extrabold tracking-tight lg:text-4xl bg-transparent text-center'
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        onKeyDown={handleNameSubmit}
                        onBlur={() => setIsEditingName(false)}
                        autoFocus
                    />
                ) : (
                    <h1
                        className='font-extrabold tracking-tight lg:text-4xl cursor-pointer'
                        onClick={() => setIsEditingName(true)}
                    >
                        {patientName}
                    </h1>
                )}
                <span className='text-xl pl-56'>
                    Dato/min
                </span>
                <div className='flex flex-col h-full justify-evenly text-xl'>
                    {variables.map(variable => {
                        const averageValue = calculateAverage(variable.key);
                        const isAbnormal = averageValue !== null && isOutOfRange(variable.key, averageValue);

                        return (
                            <div key={variable.id} className={`flex items-center m-2 p-2 ${isAbnormal ? 'bg-red-500 animate-glow' : 'bg-blue-500 hover:bg-blue-400'} text-white rounded-3xl`}>
                                <button
                                    className='flex-1 p-6 text-left font-bold'
                                    onClick={() => handleButtonClick(variable.key)}
                                >
                                    {variable.name}
                                </button>
                                {averageValue !== null && (
                                    <span className='ml-4 p-2 text-right text-2xl'>
                                        {averageValue.toFixed(2)} {variable.unit}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className='flex flex-col items-center w-3/4 h-full'>
                <div className='flex items-center mt-6'>
                    <h1 className='lg:text-4xl font-bold'>
                        {selectedVariableInfo ? selectedVariableInfo.name : 'Seleccione una variable'}
                    </h1>
                    {selectedVariable && latestData && (
                        <span className='ml-4 lg:text-4xl font-bold'>
                            {`${latestData[selectedVariable]} ${selectedVariableInfo?.unit}`}
                        </span>
                    )}
                </div>
                <div className='h-full'>
                    <ChartComponent data={data.map(d => d.data)} labels={labels} selectedVariable={selectedVariable}/>
                </div>
            </div>
        </main>
    );
}
