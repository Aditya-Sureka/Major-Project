import { useEffect, useState } from 'react';
import { FileCheck, Upload, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ClaimData {
  claim: {
    _id?: string;
    status?: string;
    requestedDocuments?: string[];
    requestedDocumentsNotes?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  status: 'verified' | 'rejected' | 'pending' | 'missing';
  required: boolean;
  uploadedDate: string | null;
  issues: string[];
  fileId?: string;
}

interface BackendDocument {
  _id: string;
  uploadedAt?: string;
  originalName?: string;
  fileName?: string;
}

interface DocumentCheckProps {
  claim: ClaimData;
  onClaimUpdated?: (updated: ClaimData) => void;
}

const base_url = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');

export const DocumentCheck: React.FC<DocumentCheckProps> = ({ claim, onClaimUpdated }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [requestNotes, setRequestNotes] = useState('Please upload the missing documents to proceed.');
  const [isRequesting, setIsRequesting] = useState(false);

  const labelize = (key: string) => {
    const map: Record<string, string> = {
      insuranceClaimForm: 'Insurance Claim Form',
      policyDocument: 'Policy Document',
      deathCert: 'Death Certificate',
      hospitalDocument: 'Hospital Records',
      fir: 'FIR / Police Report',
      'nominee.passBook': 'Nominee Passbook',
    };

    if (map[key]) return map[key];
    return key
      .replace(/\./g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (s) => s.toUpperCase());
  };

  const isRequired = (key: string) => ['insuranceClaimForm', 'policyDocument', 'deathCert'].includes(key);

  const normalizedDocumentOrder = [
    'insuranceClaimForm',
    'policyDocument',
    'deathCert',
    'hospitalDocument',
    'fir',
    'nominee.passBook',
  ];

  useEffect(() => {
    const fetchDocuments = async () => {
      const claimId = claim?.claim?._id as string | undefined;
      const token = localStorage.getItem("JWT");

      if (!claimId || !token) {
        console.warn("Missing claim id or auth token for document check");
        setDocuments([]);
        return;
      }

      try {
        const response = await fetch(`${base_url}/insurer/getClaimDocs/${claimId}`, {
          method: "GET",
          headers: {
            token,
          },
        });

        if (!response.ok) {
          console.error("Failed to fetch claim documents", response.status);
          setDocuments([]);
          return;
        }

        const json = await response.json();
        const docs: Record<string, BackendDocument[]> = json?.documents || {};
        const requestedDocuments: string[] = Array.isArray(json?.claim?.requestedDocuments)
          ? json.claim.requestedDocuments
          : Array.isArray(claim?.claim?.requestedDocuments)
          ? claim.claim.requestedDocuments
          : [];
        const keys = Array.from(new Set([...normalizedDocumentOrder, ...Object.keys(docs), ...requestedDocuments]));

        const items: DocumentItem[] = keys.map((key, index) => {
          const value = docs[key] || [];
          const uploaded = Array.isArray(value) && value.length > 0;
          const first = uploaded ? value[0] : null;
          const wasRequested = requestedDocuments.includes(key);

          return {
            id: first?._id || `${key}-${index}`,
            name: labelize(key),
            type: key,
            status: uploaded ? 'verified' : wasRequested ? 'pending' : 'missing',
            required: isRequired(key),
            uploadedDate: first?.uploadedAt || null,
            issues: uploaded ? [] : wasRequested ? ['Requested by insurer'] : ['Document not uploaded'],
            fileId: first?._id,
          };
        });

        if (json?.claim?.requestedDocumentsNotes) {
          items.unshift({
            id: `request-note-${claimId}`,
            name: 'Requested Documents Note',
            type: 'requestedDocumentsNotes',
            status: 'pending',
            required: false,
            uploadedDate: json?.claim?.requestedDocumentsAt || null,
            issues: [json.claim.requestedDocumentsNotes],
          });
        }

        setDocuments(items);
      } catch (err) {
        console.error("Error while fetching claim documents", err);
        setDocuments([]);
      }
    };

    fetchDocuments();
  }, [claim]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-400" />;
      case 'pending': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'missing': return <Upload className="h-5 w-5 text-gray-400" />;
      default: return <FileCheck className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'missing': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getCompletionRate = () => {
    const requiredDocs = documents.filter(doc => doc.required);
    if (requiredDocs.length === 0) return 0;
    const verifiedRequired = requiredDocs.filter(doc => doc.status === 'verified');
    return Math.round((verifiedRequired.length / requiredDocs.length) * 100);
  };

  const handleDownload = (fileId?: string) => {
    if (!fileId) return;
    window.open(`${base_url}/insurer/downloadDoc/${fileId}`, '_blank', 'noopener,noreferrer');
  };

  const handlePreview = (fileId?: string) => {
    if (!fileId) return;
    window.open(`${base_url}/insurer/previewDoc/${fileId}`, '_blank', 'noopener,noreferrer');
  };

  const requestMissingDocumentsNow = async () => {
    const claimId = claim?.claim?._id as string | undefined;
    const token = localStorage.getItem('JWT');

    if (!claimId || !token) return;

    const missingRequired = documents
      .filter((doc) => doc.required && doc.status === 'missing')
      .map((doc) => doc.type);

    if (!missingRequired.length) {
      return;
    }

    setIsRequesting(true);
    try {
      const response = await fetch(`${base_url}/insurer/request-docs/${claimId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token,
        },
        body: JSON.stringify({
          requestedDocuments: missingRequired,
          notes: requestNotes,
        }),
      });

      if (!response.ok) {
        let message = 'Failed to request missing documents';
        try {
          const errorJson = await response.json();
          message = errorJson?.message || errorJson?.error || message;
        } catch {
          // Keep fallback when backend does not return JSON.
        }

        toast({
          title: 'Request failed',
          description: message,
          variant: 'destructive',
        });
        return;
      }

      const json = await response.json();
      const serverClaim = json?.data;
      toast({
        title: 'Documents requested',
        description: json?.message || 'Request sent to policyholder successfully.',
      });
      if (serverClaim && onClaimUpdated) {
        onClaimUpdated({
          ...claim,
          claim: {
            ...claim.claim,
            ...serverClaim,
          },
        });
      }
    } catch (error) {
      console.error('Failed to request missing docs', error);
      toast({
        title: 'Request failed',
        description: 'Unexpected error while requesting documents.',
        variant: 'destructive',
      });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <FileCheck className="h-8 w-8 text-green-400" />
        <div>
          <h3 className="text-xl font-semibold text-black">Document Check</h3>
          <p className="text-gray-400">Manual review and verification of claim documents</p>
        </div>
      </div>

      {/* Completion Status */}
      <div className="bg-white p-6 rounded-lg border border-gray-400">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-blue-400">Document Verification Progress</h4>
          <span className="text-2xl font-bold text-blue-400">{getCompletionRate()}%</span>
        </div>
        <div className="w-full bg-white border border-gray-400 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${getCompletionRate()}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {documents.filter(doc => doc.required && doc.status === 'verified').length} of{' '}
          {documents.filter(doc => doc.required).length} required documents verified
        </p>
      </div>

      {/* Document List */}
      <div className="bg-white rounded-lg border border-gray-400">
        <div className="px-6 py-4 border-b border-gray-400">
          <h4 className="text-lg font-semibold text-black">Documents</h4>
        </div>
        <div className="divide-y divide-gray-400">
          {documents.map((doc) => (
            <div key={doc.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {getStatusIcon(doc.status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="font-medium text-gray-700">{doc.name}</h5>
                      {doc.required && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>Type: {doc.type}</span>
                      {doc.uploadedDate && (
                        <span>Uploaded: {doc.uploadedDate}</span>
                      )}
                    </div>
                    
                    {/* Issues */}
                    {doc.issues.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {doc.issues.map((issue, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-red-400">
                            <XCircle className="h-4 w-4" />
                            <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(doc.status)}`}>
                    {doc.status.toUpperCase()}
                  </span>
                  
                  {/* Action buttons */}
                  <div className="flex space-x-2">
                    {doc.status !== 'missing' && (
                      <>
                        <button
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          onClick={() => handlePreview(doc.fileId)}
                        >
                          View
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          onClick={() => handleDownload(doc.fileId)}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    
                    {doc.status === 'missing' && (
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded">
                        Request from Decision Stage
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Summary */}
      <div className="bg-gray-200 p-6 rounded-lg border border-gray-400">
        <h4 className="text-lg font-semibold text-black mb-4">Review Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {documents.filter(doc => doc.status === 'verified').length}
            </div>
            <div className="text-sm text-gray-400">Verified</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {documents.filter(doc => doc.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-400">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {documents.filter(doc => doc.status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-400">Rejected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">
              {documents.filter(doc => doc.status === 'missing').length}
            </div>
            <div className="text-sm text-gray-400">Missing</div>
          </div>
        </div>
        
        {getCompletionRate() === 100 && (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-600 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <h5 className="font-semibold text-white">All Required Documents Verified</h5>
                <p className="text-green-400">Ready to proceed to decision stage</p>
              </div>
            </div>
          </div>
        )}

        {documents.some((doc) => doc.required && doc.status === 'missing') && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg space-y-3">
            <h5 className="font-semibold text-yellow-800">Missing required documents detected</h5>
            <p className="text-sm text-yellow-700">
              You can immediately request missing documents from this stage before moving forward.
            </p>
            <textarea
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              rows={3}
              className="w-full p-2 border border-yellow-300 rounded text-sm"
              placeholder="Add notes for the policyholder"
            />
            <button
              onClick={requestMissingDocumentsNow}
              disabled={isRequesting}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400"
            >
              {isRequesting ? 'Sending request...' : 'Request Missing Documents Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};