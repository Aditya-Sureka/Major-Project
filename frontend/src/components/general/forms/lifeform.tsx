import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NomineeData {
  name: string;
  relation: string;
  email: string;
  phone: string;
  govtId: string;
  accountNo: string;
  IFSC: string;
  bankName: string;
}

interface LifeInsuranceFormData {
  uin: string;
  policyNumber: string;
  policyHolderName: string;
  dob: string;
  dateOfDeath: string;
  causeOfDeath: string;
  insurerIrdai: string;
  nominee: NomineeData;
  // ML Model Features for Fraud Detection
  age: string;
  sex: string;
  bmi: string;
  children: string;
  smoker: string;
  region: string;
  charges: string;
}

type LifeInsuranceFormProps = {
  onSubmit: (data: LifeInsuranceFormData) => void;
};

export const LifeInsuranceForm = ({ onSubmit }: LifeInsuranceFormProps) => {
  const [formData, setFormData] = useState<LifeInsuranceFormData>({
    uin: "",
    policyNumber: "",
    policyHolderName: "",
    dob: "",
    dateOfDeath: "",
    causeOfDeath: "",
    insurerIrdai : "",
    nominee: {
      name: "",
      relation: "",
      email: "",
      phone: "",
      govtId: "",
      accountNo: "",
      IFSC: "",
      bankName: "",
    },
    // ML Model Features
    age: "",
    sex: "0",
    bmi: "",
    children: "0",
    smoker: "0",
    region: "0",
    charges: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith("nominee.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        nominee: { ...prev.nominee, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = () => {
    onSubmit(formData); // Send form data to parent
    console.log("Sent to parent");
  };

  return (
    <Card className="w-full mx-auto px-4 py-8 shadow-lg rounded-2xl border border-gray-200">
  <CardHeader>
    <CardTitle className="flex items-center text-xl font-semibold text-gray-800">
      <ScrollText className="w-5 h-5 mr-2 text-[#10B981]" />
      Life Insurance Claim Form
    </CardTitle>
    <CardDescription className="mt-2 text-gray-600">
      Enter your policy, nominee, and incident details to file a claim.
    </CardDescription>
  </CardHeader>

  <CardContent className="grid gap-8">
    {/* Policy Details */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <Label htmlFor="uin">UIN</Label>
        <Input
          id="uin"
          name="uin"
          placeholder="e.g. 1234567890"
          value={formData.uin}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="policyNumber">Policy Number</Label>
        <Input
          id="policyNumber"
          name="policyNumber"
          placeholder="e.g. POL-00056789"
          value={formData.policyNumber}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="policyHolderName">Policy Holder Name</Label>
        <Input
          id="policyHolderName"
          name="policyHolderName"
          placeholder="Full name as on policy"
          value={formData.policyHolderName}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="dob">Date of Birth</Label>
        <Input
          id="dob"
          type="date"
          name="dob"
          value={formData.dob}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="dateOfDeath">Date of Death</Label>
        <Input
          id="dateOfDeath"
          type="date"
          name="dateOfDeath"
          value={formData.dateOfDeath}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="causeOfDeath">Cause of Death</Label>
        <Input
          id="causeOfDeath"
          name="causeOfDeath"
          placeholder="e.g. Cardiac arrest, accident"
          value={formData.causeOfDeath}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="insurerIrdai">Insurer IRDAI Number</Label>
        <Input
          id="insurerIrdai"
          name="insurerIrdai"
          placeholder="e.g. IRDAI123456"
          value={formData.insurerIrdai}
          onChange={handleChange}
          required
        />
      </div>
    </div>

    {/* Nominee Info */}
    <div>
      <h4 className="text-md font-semibold text-gray-700 mb-4">Nominee Information</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="nominee.name">Name</Label>
          <Input
            id="nominee.name"
            name="nominee.name"
            placeholder="Nominee full name"
            value={formData.nominee.name}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="nominee.relation">Relation</Label>
          <Input
            id="nominee.relation"
            name="nominee.relation"
            placeholder="e.g. Father, Spouse"
            value={formData.nominee.relation}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="nominee.email">Email</Label>
          <Input
            id="nominee.email"
            name="nominee.email"
            type="email"
            placeholder="e.g. nominee@example.com"
            value={formData.nominee.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="nominee.phone">Phone</Label>
          <Input
            id="nominee.phone"
            name="nominee.phone"
            type="tel"
            placeholder="e.g. 9876543210"
            value={formData.nominee.phone}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="nominee.govtId">Govt ID</Label>
          <Input
            id="nominee.govtId"
            name="nominee.govtId"
            placeholder="e.g. Aadhaar, PAN, etc."
            value={formData.nominee.govtId}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="nominee.accountNo">Account No</Label>
          <Input
            id="nominee.accountNo"
            name="nominee.accountNo"
            type="text"
            placeholder="e.g. 123456789012"
            value={formData.nominee.accountNo}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="nominee.IFSC">IFSC</Label>
          <Input
            id="nominee.IFSC"
            name="nominee.IFSC"
            placeholder="e.g. SBIN0000456"
            value={formData.nominee.IFSC}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="nominee.bankName">Bank Name</Label>
          <Input
            id="nominee.bankName"
            name="nominee.bankName"
            placeholder="e.g. State Bank of India"
            value={formData.nominee.bankName}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>

    {/* ML Model Features Section */}
    <div className="border-t pt-6 mt-6">
      <h4 className="text-md font-semibold text-gray-700 mb-4 flex items-center">
        <ScrollText className="w-4 h-4 mr-2 text-blue-600" />
        Demographic Information (for AI Risk Assessment)
      </h4>
      <p className="text-sm text-gray-500 mb-4">
        This information helps our AI model assess claim legitimacy and detect potential fraud.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            name="age"
            type="number"
            min="0"
            max="120"
            placeholder="e.g. 45"
            value={formData.age}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="sex">Gender</Label>
          <select
            id="sex"
            name="sex"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.sex}
            onChange={handleChange}
          >
            <option value="0">Female</option>
            <option value="1">Male</option>
          </select>
        </div>
        <div>
          <Label htmlFor="bmi">BMI (Body Mass Index)</Label>
          <Input
            id="bmi"
            name="bmi"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="e.g. 27.5"
            value={formData.bmi}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="children">Number of Children</Label>
          <Input
            id="children"
            name="children"
            type="number"
            min="0"
            placeholder="e.g. 2"
            value={formData.children}
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="smoker">Smoking Status</Label>
          <select
            id="smoker"
            name="smoker"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.smoker}
            onChange={handleChange}
          >
            <option value="0">Non-Smoker</option>
            <option value="1">Smoker</option>
          </select>
        </div>
        <div>
          <Label htmlFor="region">Region</Label>
          <select
            id="region"
            name="region"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={formData.region}
            onChange={handleChange}
          >
            <option value="0">Northeast</option>
            <option value="1">Northwest</option>
            <option value="2">Southeast</option>
            <option value="3">Southwest</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="charges">Claim Amount (₹)</Label>
          <Input
            id="charges"
            name="charges"
            type="number"
            min="0"
            placeholder="e.g. 150000"
            value={formData.charges}
            onChange={handleChange}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the total claim amount in Indian Rupees
          </p>
        </div>
      </div>
    </div>
  </CardContent>

  <div className="px-6 pb-6">
    <Button
      onClick={handleSubmit}
      className="w-full md:w-auto bg-black py-5 px-10 text-white font-semibold hover:bg-white hover:text-black hover:font-bold hover:border-2 border-black"
    >
      Submit
    </Button>
  </div>
</Card>

  );
};
