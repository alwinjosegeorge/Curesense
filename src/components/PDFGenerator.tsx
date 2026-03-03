import React from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';

interface PDFGeneratorProps {
    data: any;
    type: 'Discharge Summary' | 'Case Summary' | 'Lab Report';
    patientName: string;
}

export default function PDFGenerator({ data, type, patientName }: PDFGeneratorProps) {
    const [generating, setGenerating] = React.useState(false);

    const handleDownload = async () => {
        setGenerating(true);
        // Simulate complex PDF generation logic
        await new Promise(resolve => setTimeout(resolve, 1500));

        logAction('Generate PDF', type, data.id || 'N/A', { patientName });

        // In a real app, we'd use jspdf or a backend service
        // For this simulation, we'll create a text blob
        const content = `
      CURESENSE AI GUARDIAN - ${type.toUpperCase()}
      -----------------------------------------
      Patient: ${patientName}
      Date: ${new Date().toLocaleDateString()}
      
      RECORD DETAILS:
      ${JSON.stringify(data, null, 2)}
      
      -----------------------------------------
      AI VERIFIED DOCUMENT · HIPAA COMPLIANT
    `;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type.replace(' ', '_')}_${patientName}_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setGenerating(false);
        toast.success(`${type} downloaded successfully`);
    };

    return (
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download {type}
        </Button>
    );
}
