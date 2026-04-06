import { useMemo, useState } from 'react';
import { CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';

interface ClaimData {
  id?: string;
  insuranceDetails: {
    ownerName?: string;
    policyHolderName?: string;
    charges?: number;
    insuranceClaimForm?: string | null;
    policyDocument?: string | null;
    deathCert?: string | null;
    hospitalDocument?: string | null;
    fir?: string | null;
    nominee?: {
      passBook?: string | null;
    };
  };
  documentSummary?: {
    totalRequired?: number;
    uploadedCount?: number;
    availableDocumentKeys?: string[];
    requestedDocuments?: string[];
    requestedDocumentsNotes?: string | null;
  };
  claim: {
    _id?: string;
    policyType: string;
    status?: string;
    aiScore?: number;
    rejectionReason?: string | null;
    rejectionAdditionalData?: string | null;
    requestedDocuments?: string[];
    requestedDocumentsNotes?: string | null;
    requestedDocumentsAt?: string | null;
    decisionAt?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface DecisionAreaProps {
  claim: ClaimData;
  onClaimUpdated?: (updated: ClaimData) => void;
}

const base_url = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');

const documentCandidates = [
  { key: 'insuranceClaimForm', label: 'Insurance Claim Form' },
  { key: 'policyDocument', label: 'Policy Document' },
  { key: 'deathCert', label: 'Death Certificate' },
  { key: 'hospitalDocument', label: 'Hospital Records' },
  { key: 'fir', label: 'FIR / Police Report' },
  { key: 'nominee.passBook', label: 'Nominee Passbook' },
];

const getClaimId = (claim: ClaimData) => (claim?.claim?._id as string | undefined) || (claim?.id as string | undefined);

const getAvailableDocuments = (claim: ClaimData) => {
  return documentCandidates.filter((doc) => {
    if (doc.key === 'nominee.passBook') {
      return !!claim?.insuranceDetails?.nominee?.passBook;
    }

    return !!claim?.insuranceDetails?.[doc.key as keyof ClaimData['insuranceDetails']];
  });
};

export const DecisionArea: React.FC<DecisionAreaProps> = ({ claim, onClaimUpdated }) => {
  const [decision, setDecision] = useState<'approve' | 'reject' | 'request-docs' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [requestedDocs, setRequestedDocs] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableDocs = useMemo(() => getAvailableDocuments(claim), [claim]);
  const completionRate = useMemo(() => {
    if (documentCandidates.length === 0) return 0;
    return Math.round((availableDocs.length / documentCandidates.length) * 100);
  }, [availableDocs]);

  const requestedDocsFromClaim = Array.isArray(claim?.claim?.requestedDocuments)
    ? claim.claim.requestedDocuments
    : [];

  const reasonSource =
    claim?.claim?.rejectionReason ||
    claim?.claim?.requestedDocumentsNotes ||
    claim?.documentSummary?.requestedDocumentsNotes ||
    'No insurer reason available yet';

  const aiScore = typeof claim?.claim?.aiScore === 'number' ? claim.claim.aiScore : null;

  const handleDecision = (type: 'approve' | 'reject' | 'request-docs') => {
    setDecision(type);

    if (type === 'request-docs') {
      setRequestedDocs(requestedDocsFromClaim);
      setShowConfirmation(false);
      return;
    }

    setRequestedDocs([]);
    setShowConfirmation(type === 'approve');
  };

  const toggleRequestedDoc = (field: string) => {
    setRequestedDocs((prev) =>
      prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]
    );
  };

  const postDecision = async (endpoint: string, body?: Record<string, unknown>) => {
    const token = localStorage.getItem('JWT');
    const claimId = getClaimId(claim);

    if (!token || !claimId) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${base_url}${endpoint}/${claimId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        return;
      }

      const json = await response.json();
      const serverClaim = json?.data;
      if (!serverClaim) {
        return;
      }

      const updated: ClaimData = {
        ...claim,
        claim: {
          ...claim.claim,
          ...serverClaim,
        },
      };

      if (onClaimUpdated) {
        onClaimUpdated(updated);
      }

      setDecision(null);
      setShowConfirmation(false);
      setRejectionReason('');
      setAdditionalNotes('');
      setRequestedDocs([]);
    } catch (error) {
      console.error('Error while updating decision', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDecision = async () => {
    if (!decision) return;

    if (decision === 'approve') {
      await postDecision('/insurer/approve');
      return;
    }

    if (decision === 'reject') {
      await postDecision('/insurer/reject', {
        rejectionReason,
        rejectionAdditionalData: additionalNotes,
      });
      return;
    }

    await postDecision('/insurer/request-docs', {
      requestedDocuments: requestedDocs,
      notes: additionalNotes,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <AlertTriangle className="h-8 w-8 text-yellow-400" />
        <div>
          <h3 className="text-xl font-semibold text-black">Decision Area</h3>
          <p className="text-gray-400">Final decision on claim approval, rejection, or document request</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-400">
        <h4 className="text-lg font-semibold text-black mb-4">Claim Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-400">Claim Amount</p>
            <p className="text-xl font-bold text-black">
              {typeof claim?.insuranceDetails?.charges === 'number'
                ? `₹${claim.insuranceDetails.charges.toLocaleString()}`
                : 'Amount not available'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">AI Risk Score</p>
            <p className="text-lg font-semibold text-black">
              {aiScore === null ? 'Pending AI score' : `${aiScore}%`}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Document Completeness</p>
            <p className="text-lg font-semibold text-black">
              {completionRate}% ({availableDocs.length}/{documentCandidates.length})
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Current Status</p>
            <p className="text-lg font-semibold text-black">{claim?.claim?.status || 'Unknown'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-400">
        <h4 className="text-lg font-semibold text-black mb-3">Insurer Reason Source</h4>
        <p className="text-sm text-gray-700">{reasonSource}</p>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-400">
        <h4 className="text-lg font-semibold text-black mb-4">Requested Documents</h4>
        <p className="text-sm text-gray-700">
          {requestedDocsFromClaim.length > 0 ? requestedDocsFromClaim.join(', ') : 'No requested documents on record'}
        </p>
      </div>

      {!decision && (
        <div className="bg-gray-200 p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-semibold text-black mb-4">Make Decision</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleDecision('approve')}
              className="p-6 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-center"
            >
              <CheckCircle className="h-12 w-12 text-white mx-auto mb-3" />
              <h5 className="text-lg font-semibold text-white">Approve Claim</h5>
              <p className="text-green-200 text-sm">Settle and close this claim</p>
            </button>

            <button
              onClick={() => handleDecision('reject')}
              className="p-6 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-center"
            >
              <XCircle className="h-12 w-12 text-white mx-auto mb-3" />
              <h5 className="text-lg font-semibold text-white">Reject Claim</h5>
              <p className="text-red-200 text-sm">Deny claim with reason</p>
            </button>

            <button
              onClick={() => handleDecision('request-docs')}
              className="p-6 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-center"
            >
              <FileText className="h-12 w-12 text-white mx-auto mb-3" />
              <h5 className="text-lg font-semibold text-white">Request Documents</h5>
              <p className="text-blue-200 text-sm">Ask policyholder for missing documents</p>
            </button>
          </div>
        </div>
      )}

      {decision === 'reject' && (
        <div className="bg-gray-800 p-6 rounded-lg border border-red-600">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <XCircle className="h-6 w-6 text-red-400 mr-2" />
            Reject Claim
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Reason for Rejection *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-red-500 focus:outline-none"
                placeholder="Write the reason for rejection..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Additional Notes</label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-red-500 focus:outline-none"
                placeholder="Provide additional context for the rejection..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmDecision}
                disabled={!rejectionReason || isSubmitting}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => setDecision(null)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {decision === 'request-docs' && (
        <div className="bg-gray-800 p-6 rounded-lg border border-blue-600">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FileText className="h-6 w-6 text-blue-400 mr-2" />
            Request Additional Documents
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Required Documents</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                {documentCandidates.map((doc) => (
                  <label key={doc.key} className="flex items-center space-x-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={requestedDocs.includes(doc.key)}
                      onChange={() => toggleRequestedDoc(doc.key)}
                    />
                    <span>{doc.label}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="Add optional notes for the policyholder..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmDecision}
                disabled={requestedDocs.length === 0 || isSubmitting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Send Request'}
              </button>
              <button
                onClick={() => setDecision(null)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmation && decision === 'approve' && (
        <div className="bg-gray-800 p-6 rounded-lg border border-green-600">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <CheckCircle className="h-6 w-6 text-green-400 mr-2" />
            Confirm Approval
          </h4>
          <p className="text-gray-300 mb-4">This will mark the claim as settled.</p>
          <div className="flex space-x-3">
            <button
              onClick={confirmDecision}
              disabled={isSubmitting}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Approval'}
            </button>
            <button
              onClick={() => {
                setDecision(null);
                setShowConfirmation(false);
              }}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
