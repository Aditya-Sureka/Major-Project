import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Shield } from "lucide-react";
import { Info } from 'lucide-react';
import { LifeInsuranceForm } from '../../forms/lifeform';

interface PolicySnapshot {
  claim: {
    _id: string;
    status?: string;
    createdAt?: string;
  };
  insuranceDetails: {
    policyNumber?: string;
    policyHolderName?: string;
    uin?: string;
    insurerIrdai?: string;
    charges?: number;
    createdAt?: string;
  };
}

const PolicySection = () => {
  const [insuranceType, setInsuranceType] = useState("Life insurance");
  const [insuranceFormData, setinsuranceFormData] = useState({});
  const [latestPolicy, setLatestPolicy] = useState<PolicySnapshot | null>(null);
  const [isPolicyLoading, setIsPolicyLoading] = useState(true);
  const [policyError, setPolicyError] = useState("");

  useEffect(() => {
    const fetchLatestPolicy = async () => {
      const token = localStorage.getItem("JWT");
      if (!token) {
        setIsPolicyLoading(false);
        return;
      }

      try {
        const base_url = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
        const response = await fetch(`${base_url}/claim/getPolicies`, {
          method: 'GET',
          headers: {
            token,
          },
        });

        if (!response.ok) {
          setPolicyError("Unable to load previous policies right now.");
          setIsPolicyLoading(false);
          return;
        }

        const data = await response.json();
        const policyList = Array.isArray(data?.data) ? data.data : [];
        setLatestPolicy(policyList[0] || null);
      } catch (error) {
        console.error(error);
        setPolicyError("Unable to load previous policies right now.");
      } finally {
        setIsPolicyLoading(false);
      }
    };

    fetchLatestPolicy();
  },[])

  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File | null }>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFiles((prev) => ({ ...prev, [label]: file }));
      console.log(uploadedFiles);
    }
  };

  const renderForm = () => {
    return <LifeInsuranceForm onSubmit={(formData) => setinsuranceFormData(formData)}/>;
  };

  const fileUploadContents = () => {
    // Only life insurance file fields remain
    return [
      "insuranceClaimForm",
      "passBook",
      "policyDocument",
      "deathCert",
      "hospitalDocument",
      "fir",
    ];
  }

  const buildFormData = (
    formValues: Record<string, unknown>,
    uploadedFiles: Record<string, File>
  ): FormData => {
    const formData = new FormData();
  
    // Helper: flatten and append form values
    const appendFields = (data: unknown, parentKey = "") => {
      if (data && typeof data === "object" && !Array.isArray(data)) {
        Object.entries(data).forEach(([key, value]) => {
          const fullKey = parentKey ? `${parentKey}.${key}` : key;
    
          if (value instanceof Blob) {
            formData.append(fullKey, value); // Not expected here, but safe
          } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            appendFields(value, fullKey); // Recursively flatten objects
          } else {
            formData.append(fullKey, String(value ?? ""));
          }
        });
      }
    };
  
    appendFields(formValues);
  
    // Append uploaded files
    Object.entries(uploadedFiles).forEach(([label, file]) => {
      const key = label; // e.g., "Death certificate" -> "death_certificate"
      formData.append(key, file);
    });
  
    return formData;
  };


  const submitForm = async () => {
    const formData = buildFormData(insuranceFormData, uploadedFiles);
  
    console.log("Merged formData contents:");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    const routes = {
      'Life insurance': '/check/lifeInsurance',
    };
  
    // Ensure insuranceType is available from state or passed in
    const jwt = localStorage.getItem("JWT");
  
    try {
      const base_url = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
      const response = await fetch(`${base_url}${routes[insuranceType]}`, {
        method: 'POST',
        headers: {
          'token': jwt || '', // ✅ if your backend is using this custom header
        },
        credentials: "include", // ✅ if using cookies for session
        body: formData,
      });
  
      const data = await response.json();
      console.log("Server response:", data);
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit form");
      }
  
      // handle success (e.g., navigate or show alert)
    } catch (error) {
      console.error("Form submission error:", error);
      alert("Something went wrong while submitting the form.");
    }
  };

  const getDocumentInfo = () => {
    return "Upload the policy bond or e-policy PDF issued by your insurer.";
  };

  // const coverageData = [
  //   { type: "Auto Liability", covered: true, limit: "$500,000", deductible: "$500" },
  //   { type: "Collision", covered: true, limit: "$50,000", deductible: "$1,000" },
  //   { type: "Comprehensive", covered: true, limit: "$50,000", deductible: "$500" },
  //   { type: "Medical Payments", covered: true, limit: "$10,000", deductible: "$0" },
  //   { type: "Uninsured Motorist", covered: false, limit: "N/A", deductible: "N/A" }
  // ];

  return (
    <div className="space-y-6">
      <Card className='py-4 px-4'>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-blue-700" />
          Know Your Policy
        </CardTitle>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 mt-4">
          <p className="text-sm font-semibold text-slate-800">Latest Policy</p>
          {isPolicyLoading && <p className="text-sm text-slate-500 mt-1">Checking your existing policy details...</p>}
          {!isPolicyLoading && policyError && <p className="text-sm text-red-600 mt-1">{policyError}</p>}
          {!isPolicyLoading && !policyError && !latestPolicy && (
            <p className="text-sm text-slate-500 mt-1">No previous life policy found on the platform yet.</p>
          )}
          {!isPolicyLoading && !policyError && latestPolicy && (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
              <p><span className="font-medium">Claim Status:</span> {latestPolicy.claim.status || 'N/A'}</p>
              <p><span className="font-medium">Policy Holder:</span> {latestPolicy.insuranceDetails.policyHolderName || 'N/A'}</p>
              <p><span className="font-medium">Policy Number:</span> {latestPolicy.insuranceDetails.policyNumber || 'N/A'}</p>
              <p><span className="font-medium">UIN:</span> {latestPolicy.insuranceDetails.uin || 'N/A'}</p>
              <p><span className="font-medium">Estimated Charge:</span> {typeof latestPolicy.insuranceDetails.charges === 'number' ? `₹${latestPolicy.insuranceDetails.charges.toLocaleString()}` : 'N/A'}</p>
              <p><span className="font-medium">Claim Created:</span> {latestPolicy.claim.createdAt ? new Date(latestPolicy.claim.createdAt).toLocaleString() : 'N/A'}</p>
            </div>
          )}
        </div>

        {/* Dropdown */}
        <div className="my-6">
          <label htmlFor="insuranceType" className="block text-sm font-medium text-gray-700 mb-1">
            Select Insurance Type
          </label>
          <select
            id="insuranceType"
            name="insuranceType"
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={insuranceType}
            onChange={(e) => setInsuranceType(e.target.value)}
          >
                    <option>Life insurance</option>
          </select>
        </div>

        {/* Description */}
        <CardDescription className="my-8 flex items-start text-gray-600">
          <Info className="w-4 h-4 text-red-500 mt-1 mr-2 text-base" />
          {getDocumentInfo()}
        </CardDescription>

                {/* Render Form */}
          <div className="mt-10 w-full">{renderForm()}</div>
          </CardHeader>

          
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {fileUploadContents()?.map((label, index) => {
              const file = uploadedFiles[label];
              const borderColor = file ? "border-blue-500" : "border-gray-300";

              return (
                <div
                  key={index}
                  className={`border-2 border-dashed ${borderColor} rounded-lg p-8 text-center transition-all`}
                >
                  <Input
                    id={`policy-upload-${index}`}
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={(e) => handleFileUpload(e, label)}
                    className="hidden"
                  />
                  <label htmlFor={`policy-upload-${index}`} className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium hover:text-blue-700">
                        {file ? file.name : `${label}`}
                      </p>
                      <p className="text-sm text-gray-500">PDF, DOC, or DOCX up to 10MB</p>
                      <Button asChild className="mt-4">
                        <label htmlFor={`policy-upload-${index}`} className="cursor-pointer">
                          {file ? "Change File" : "Choose File"}
                        </label>
                      </Button>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </CardContent>
            <Button
            onClick={()=>submitForm()}
            className='bg-black py-6 ml-4 px-8 ml:auto text-white font-bold hover:bg-white hover:text-black hover:font-bold hover:border-2 border-black'>
              Submit
            </Button>
      </Card>
    </div>
  );
};

export default PolicySection;