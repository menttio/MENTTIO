import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug } from 'lucide-react';

export default function GoogleCalendarDebug({ userType = 'teacher' }) {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('debugGoogleCalendar', { userType });
      setDebugInfo(result.data);
    } catch (error) {
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Bug size={16} />
          Debug Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={runDebug} disabled={loading} size="sm">
          {loading ? 'Analizando...' : 'Ejecutar Debug'}
        </Button>
        
        {debugInfo && (
          <pre className="mt-4 p-4 bg-white rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}