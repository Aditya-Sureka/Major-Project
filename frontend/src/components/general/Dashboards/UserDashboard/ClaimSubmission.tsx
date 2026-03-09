import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Shield } from "lucide-react";
import { Info } from 'lucide-react';
import { LifeInsuranceForm } from '../../forms/lifeform';

const ClaimSubmission = () => {
  const [insuranceType, setInsuranceType] = useState("Life insurance");
  const [insuranceFormData, setinsuranceFormData] = useState({});

  useEffect(()=>{
    console.log(insuranceFormData);
  },[insuranceFormData])

  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File | null }>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFiles((prev) => ({ ...prev, [label]: file }));
      console.log(uploadedFiles);
    }
  };

  //

  const renderForm = () => {
    return <LifeInsuranceForm onSubmit={(formData) => setinsuranceFormData(formData)}/>;
  };

  const fileUploadContents = () => {
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
    uploadedFiles: Record<string, File | null>
  ): FormData => {
    const formData = new FormData();
  
    // Helper: flatten and append form values
    const appendFields = (data: Record<string, unknown>, parentKey = "") => {
      Object.entries(data).forEach(([key, value]) => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
  
        if (value instanceof Blob) {
          formData.append(fullKey, value); // Not expected here, but safe
        } else if (typeof value === "object" && value !== null) {
          appendFields(value as Record<string, unknown>, fullKey); // Recursively flatten objects
        } else {
          formData.append(fullKey, String(value ?? ""));
        }
      });
    };
  
    appendFields(formValues);
  
    // Append uploaded files (only if file is not null)
    Object.entries(uploadedFiles).forEach(([label, file]) => {
      if (file) {
        const key = label; // e.g., "Death certificate" -> "death_certificate"
        formData.append(key, file);
      }
    });
  
    return formData;
  };


  const transformFormDataForBackend = (data: Record<string, unknown>, type: string): Record<string, unknown> => {
    const transformed = { ...data };
    
    // Transform Life Insurance form data
    if (type === 'Life insurance' && transformed.nominee && typeof transformed.nominee === 'object') {
      const nominee = transformed.nominee as Record<string, unknown>;
      // Flatten nominee object to match backend expectations
      transformed.nomineeName = nominee.name || '';
      transformed.nomineeRelation = nominee.relation || '';
      transformed.nomineeEmail = nominee.email || '';
      transformed.nomineePhone = nominee.phone || '';
      transformed.nomineeGovtId = nominee.govtId || '';
      transformed.nomineeAccountNo = nominee.accountNo || '';
      transformed.nomineeIFSC = nominee.IFSC || '';
      transformed.nomineeBankName = nominee.bankName || '';
      // Remove the nested nominee object
      delete transformed.nominee;
      
      // Handle ML model fields - convert empty strings to undefined so backend can handle defaults
      const mlFields = ['age', 'sex', 'bmi', 'children', 'smoker', 'region', 'charges'];
      mlFields.forEach(field => {
        if (transformed[field] === '' || transformed[field] === null) {
          // Keep default values for sex, children, smoker, region (they have defaults)
          if (field === 'sex' || field === 'children' || field === 'smoker' || field === 'region') {
            // Keep the default value from form (already set to "0")
          } else {
            // For age, bmi, charges - set to undefined so backend can handle null
            transformed[field] = undefined;
          }
        }
      });
    }
    
    return transformed;
  };

  const submitForm = async () => {
    // Validation: Check if form data is empty
    if (!insuranceFormData || Object.keys(insuranceFormData).length === 0) {
      alert("Please fill in the form before submitting.");
      return;
    }

    console.log("Original insuranceFormData:", insuranceFormData);

    const routes = {
      'Life insurance': '/claim/lifeInsurance',
    };

    // Validation: Check if route exists for insurance type
    if (!routes[insuranceType as keyof typeof routes]) {
      alert(`Invalid insurance type: ${insuranceType}`);
      return;
    }

    // Transform form data to match backend expectations
    const transformedData = transformFormDataForBackend(insuranceFormData, insuranceType);
    console.log("Transformed form data:", transformedData);
    
    // Validate required fields for Life Insurance
    if (insuranceType === 'Life insurance') {
      const required = ['insurerIrdai', 'uin', 'policyNumber', 'policyHolderName'];
      const missing = required.filter(field => !transformedData[field] || transformedData[field] === '');
      if (missing.length > 0) {
        alert(`Please fill in the following required fields in the form above:\n${missing.join(', ')}\n\nMake sure you click the form's submit button first!`);
        console.error("Missing required fields:", missing);
        console.error("Current form data:", transformedData);
        return;
      }
    }

    const formData = buildFormData(transformedData, uploadedFiles);
  
    console.log("Merged formData contents:");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
  
    // Ensure insuranceType is available from state or passed in
    const jwt = localStorage.getItem("JWT");
    if (!jwt) {
      alert("Please log in to submit a claim.");
      return;
    }

    const base_url = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
    if (!base_url) {
      alert("Backend URL is not configured. Please check your environment variables.");
      return;
    }

    const url = `${base_url}${routes[insuranceType as keyof typeof routes]}`;
    console.log("Submitting to URL:", url);
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'token': jwt, // ✅ if your backend is using this custom header
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        credentials: "include", // ✅ if using cookies for session
        body: formData,
    });
  
      // Check if response is ok before trying to parse JSON
      const contentType = response.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // If response is not JSON, get text instead
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }

      console.log("Server response:", data);
  
      if (!response.ok) {
        throw new Error(data.message || data.error || `Server error: ${response.status} ${response.statusText}`);
      }
  
      // handle success (e.g., navigate or show alert)
      alert("Claim submitted successfully!");
      // Optionally reset form
      setinsuranceFormData({});
      setUploadedFiles({});
    } catch (error) {
      console.error("Form submission error:", error);
      console.error("Request URL:", url);
      
      let errorMessage = "Something went wrong while submitting the form.";
      
      if (error instanceof TypeError && error.message.includes("fetch")) {
        // Check for specific network errors
        if (error.message.includes("Failed to fetch") || error.message.includes("ERR_")) {
          errorMessage = "Cannot connect to the server. Please ensure:\n1. The backend server is running on port 3000\n2. Check the backend terminal for errors\n3. Verify your network connection";
        } else {
          errorMessage = "Network error: Could not connect to the server. Please check your internet connection and try again.";
        }
      } else if (error instanceof SyntaxError) {
        errorMessage = "Server returned invalid response. Please try again.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error("Error details:", error);
      console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      alert(errorMessage);
    }
  };

  const getDocumentInfo = (type: string) => {
    if (type === "Life insurance") {
      return "Upload the policy bond or e-policy PDF issued by your insurer.";
    }
    return "";
  };


  return (
    <div className="space-y-6">
      <Card className='py-4 px-2'>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-blue-700" />
          Submit claims
        </CardTitle>

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
          {getDocumentInfo(insuranceType)}
        </CardDescription>

                {/* Render Form */}
          
          </CardHeader>
          <div className="mt-4 p-2 h-full w-full">{renderForm()}</div>

          
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {(fileUploadContents() || []).map((label, index) => {
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
                    accept=".pdf,.doc,.docx"
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
            className='bg-black py-6 ml-6 px-8 ml:auto text-white font-bold hover:bg-white hover:text-black hover:font-bold hover:border-2 border-black'>
              Submit
            </Button>
      </Card>
    </div>
  );
};

export default ClaimSubmission;