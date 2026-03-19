import { useEffect, useState } from 'react';
import { FileCheck, Upload, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';

interface ClaimData {
  claim: {
    _id?: string;
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

interface DocumentCheckProps {
  claim: ClaimData;
}

const base_url = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');

export const DocumentCheck: React.FC<DocumentCheckProps> = ({ claim }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

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
        const docs = json?.documents || {};

        const mapping: { key: string; name: string; type: string; required: boolean }[] = [
          { key: "insuranceClaimForm", name: "Insurance Claim Form", type: "claim", required: true },
          { key: "policyDocument", name: "Policy Document", type: "policy", required: true },
          { key: "deathCert", name: "Death Certificate", type: "death", required: true },
          { key: "hospitalDocument", name: "Hospital Records", type: "hospital", required: false },
          { key: "fir", name: "FIR / Police Report", type: "police", required: false },
          { key: "nominee.passBook", name: "Nominee Passbook", type: "bank", required: false },
        ];

        const items: DocumentItem[] = mapping.map((m, index) => {
          const value = docs[m.key] || [];
          const uploaded = Array.isArray(value) && value.length > 0;
          const first = uploaded ? value[0] : null;

          return {
            id: first?._id || `${m.key}-${index}`,
            name: m.name,
            type: m.type,
            status: uploaded ? 'verified' : 'missing',
            required: m.required,
            uploadedDate: first?.uploadedAt || null,
            issues: uploaded ? [] : ['Document not uploaded'],
            fileId: first?._id,
          };
        });

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

  const approveDocument = (docId: number) => {
    setDocuments(docs => 
      docs.map(doc => 
        doc.id === docId 
          ? { ...doc, status: 'verified', issues: [] }
          : doc
      )
    );
  };

  const rejectDocument = (docId: number, reason: string) => {
    setDocuments(docs => 
      docs.map(doc => 
        doc.id === docId 
          ? { ...doc, status: 'rejected', issues: [reason] }
          : doc
      )
    );
  };

  const getCompletionRate = () => {
    const requiredDocs = documents.filter(doc => doc.required);
    const verifiedRequired = requiredDocs.filter(doc => doc.status === 'verified');
    return Math.round((verifiedRequired.length / requiredDocs.length) * 100);
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
                      <button className="p-2 text-gray-400 hover:text-white transition-colors">
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    
                    {doc.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveDocument(doc.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectDocument(doc.id, 'Quality issues identified')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    
                    {doc.status === 'missing' && (
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
                        Request
                      </button>
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
      </div>
    </div>
  );
};