import { useState } from 'react';
import { CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';

interface ClaimData {
  id?: string;
  insuranceDetails: {
    ownerName?: string;
    policyHolderName?: string;
  };
  claim: {
    _id?: string;
    policyType: string;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface DecisionAreaProps {
  claim: ClaimData;
  onClaimUpdated?: (updated: ClaimData) => void;
}

const base_url = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');

export const DecisionArea: React.FC<DecisionAreaProps> = ({ claim, onClaimUpdated }) => {
  const [decision, setDecision] = useState<'approve' | 'reject' | 'request-docs' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getClaimId = () => (claim?.claim?._id as string | undefined) || (claim.id as string | undefined);

  const handleDecision = (type: 'approve' | 'reject' | 'request-docs') => {
    setDecision(type);
    if (type === 'approve') {
      setShowConfirmation(true);
    }
  };

  const postDecision = async (endpoint: string, body?: Record<string, unknown>) => {
    const token = localStorage.getItem("JWT");
    const claimId = getClaimId();

    if (!token || !claimId) {
      console.warn("Missing auth token or claim id for decision");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${base_url}${endpoint}/${claimId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        console.error("Failed to update claim decision", response.status);
        return;
      }

      const newStatus =
        endpoint.includes("/approve")
          ? "Settled"
          : endpoint.includes("/reject")
          ? "Rejected"
          : "UnderReview";

      const updated: ClaimData = {
        ...claim,
        claim: {
          ...claim.claim,
          status: newStatus,
          rejectionReason: endpoint.includes("/reject") ? rejectionReason : undefined,
          rejectionAdditionalData: endpoint.includes("/reject") ? additionalNotes : undefined,
        },
      };

      onClaimUpdated && onClaimUpdated(updated);
    } catch (err) {
      console.error("Error while updating decision", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDecision = async () => {
    if (!decision) return;

    if (decision === "approve") {
      await postDecision("/insurer/approve");
    } else if (decision === "reject") {
      await postDecision("/insurer/reject", {
        rejectionReason,
        rejectionAdditionalData: additionalNotes,
      });
    } else if (decision === "request-docs") {
      await postDecision("/insurer/review");
    }

    setShowConfirmation(false);
  };

  const rejectionReasons = [
    'Insufficient documentation',
    'Policy violation',
    'Fraudulent activity suspected',
    'Claim exceeds policy limits',
    'Pre-existing condition',
    'Not covered under policy terms',
    'Other (specify in notes)'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <AlertTriangle className="h-8 w-8 text-yellow-400" />
        <div>
          <h3 className="text-xl font-semibold text-white">Decision Area</h3>
          <p className="text-gray-400">Final decision on claim approval or rejection</p>
        </div>
      </div>

      {/* Claim Summary for Decision */}
      <div className="bg-white p-6 rounded-lg border border-gray-400">
        <h4 className="text-lg font-semibold text-black mb-4">Claim Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-400">Claim Amount</p>
            <p className="text-xl font-bold text-black">${"####"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Risk Assessment</p>
            <p className="text-lg font-semibold text-red-400">73% High Risk</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Documentation Status</p>
            <p className="text-lg font-semibold text-yellow-400">Incomplete</p>
          </div>
        </div>
      </div>

      {/* Processing Results Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-400">
        <h4 className="text-lg font-semibold text-black mb-4">Processing Results</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white border border-red-400 rounded-lg">
            <span className="text-red-500">AI Risk Evaluation</span>
            <div className="flex items-center space-x-2">
              <span className="text-red-400">High Risk (73%)</span>
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-white border border-yellow-400 rounded-lg">
            <span className="text-yellow-500">Fraud Detection</span>
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">Medium Risk (65%)</span>
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-white border border-red-400 rounded-lg">
            <span className="text-red-500">Document Check</span>
            <div className="flex items-center space-x-2">
              <span className="text-red-400">Incomplete (75%)</span>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {!decision && (
        <>
          {/* Decision Options */}
          <div className="bg-gray-200 p-6 rounded-lg border border-gray-200">
            <h4 className="text-lg font-semibold text-black mb-4">Make Decision</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleDecision('approve')}
                className="p-6 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-center"
              >
                <CheckCircle className="h-12 w-12 text-white mx-auto mb-3" />
                <h5 className="text-lg font-semibold text-white">Approve Claim</h5>
                <p className="text-green-200 text-sm">Process payment</p>
              </button>
              
              <button
                onClick={() => handleDecision('reject')}
                className="p-6 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-center"
              >
                <XCircle className="h-12 w-12 text-white mx-auto mb-3" />
                <h5 className="text-lg font-semibold text-white">Reject Claim</h5>
                <p className="text-red-200 text-sm">Deny coverage</p>
              </button>
              
              <button
                onClick={() => handleDecision('request-docs')}
                className="p-6 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-center"
              >
                <FileText className="h-12 w-12 text-white mx-auto mb-3" />
                <h5 className="text-lg font-semibold text-white">Request Documents</h5>
                <p className="text-blue-200 text-sm">Need more info</p>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Rejection Form */}
      {decision === 'reject' && (
        <div className="bg-gray-800 p-6 rounded-lg border border-red-600">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <XCircle className="h-6 w-6 text-red-400 mr-2" />
            Reject Claim
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Rejection *
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-red-500 focus:outline-none"
              >
                <option value="">Select a reason...</option>
                {rejectionReasons.map((reason, index) => (
                  <option key={index} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes
              </label>
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
                {isSubmitting ? "Submitting..." : "Confirm Rejection"}
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

      {/* Request Documents Form */}
      {decision === 'request-docs' && (
        <div className="bg-gray-800 p-6 rounded-lg border border-blue-600">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FileText className="h-6 w-6 text-blue-400 mr-2" />
            Request Additional Documents
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Specify Required Documents
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="List the specific documents needed to complete the claim review..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmDecision}
                disabled={isSubmitting}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? "Sending..." : "Send Request"}
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

      {/* Approval Confirmation */}
      {showConfirmation && decision === 'approve' && (
        <div className="bg-gray-800 p-6 rounded-lg border border-green-600">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <CheckCircle className="h-6 w-6 text-green-400 mr-2" />
            Confirm Claim Approval
          </h4>
          <div className="bg-yellow-900/20 border border-yellow-600 p-4 rounded-lg mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-400 mt-0.5" />
              <div>
                <h5 className="font-semibold text-white">Warning: High Risk Claim</h5>
                <p className="text-yellow-400 text-sm">
                  This claim has been flagged as high risk. Are you sure you want to approve it?
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Approval Notes (Optional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                placeholder="Add any notes regarding this approval decision..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={confirmDecision}
                disabled={isSubmitting}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isSubmitting ? "Approving..." : "Confirm Approval"}
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setDecision(null);
                }}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};