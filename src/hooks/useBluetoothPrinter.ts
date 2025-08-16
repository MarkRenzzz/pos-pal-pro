import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Extend Navigator interface for Bluetooth
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: any): Promise<BluetoothDevice>;
    };
  }
  
  interface BluetoothDevice {
    gatt?: BluetoothRemoteGATT;
  }
  
  interface BluetoothRemoteGATT {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
  }
  
  interface BluetoothRemoteGATTServer {
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }
  
  interface BluetoothRemoteGATTService {
    getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
    properties: {
      write: boolean;
      writeWithoutResponse: boolean;
    };
    writeValue(data: ArrayBuffer): Promise<void>;
  }
}

interface BluetoothPrinterHook {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  print: (content: string) => Promise<void>;
}

export const useBluetoothPrinter = (): BluetoothPrinterHook => {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [characteristic, setCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      toast.error('Bluetooth is not supported in this browser');
      return;
    }

    setIsConnecting(true);
    
    try {
      // Request device with printer service UUID
      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'PT-' }, // PT-210 printer
          { namePrefix: 'MTP' },
          { namePrefix: 'POS' }
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Common printer service
          '0000180a-0000-1000-8000-00805f9b34fb'  // Device Information Service
        ]
      });

      const server = await bluetoothDevice.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      // Try to find the printer service
      let service;
      try {
        service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      } catch {
        // Fallback to device information service
        service = await server.getPrimaryService('0000180a-0000-1000-8000-00805f9b34fb');
      }

      const chars = await service.getCharacteristics();
      const writeChar = chars.find(char => char.properties.write || char.properties.writeWithoutResponse);
      
      if (!writeChar) throw new Error('No writable characteristic found');

      setDevice(bluetoothDevice);
      setCharacteristic(writeChar);
      setIsConnected(true);
      toast.success('Bluetooth printer connected successfully');
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      toast.error('Failed to connect to Bluetooth printer');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    setDevice(null);
    setCharacteristic(null);
    setIsConnected(false);
    toast.info('Bluetooth printer disconnected');
  }, [device]);

  const print = useCallback(async (content: string) => {
    if (!characteristic || !isConnected) {
      toast.error('Printer not connected');
      return;
    }

    try {
      // Convert content to ESC/POS commands for thermal printer
      const encoder = new TextEncoder();
      
      // ESC/POS commands for 58mm thermal printer
      const commands = [
        '\x1B\x40', // Initialize printer
        '\x1B\x61\x01', // Center align
        content,
        '\x1B\x61\x00', // Left align
        '\x0A\x0A\x0A', // Line feeds
        '\x1D\x56\x42\x00' // Cut paper
      ].join('');

      const data = encoder.encode(commands);
      
      // Split data into chunks for reliable transmission
      const chunkSize = 20;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      toast.success('Receipt printed successfully');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print receipt');
    }
  }, [characteristic, isConnected]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    print
  };
};