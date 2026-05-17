import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Shield, FileText, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import PolicySection from "@/components/general/Dashboards/UserDashboard/PolicySection";
import ClaimSubmission from "@/components/general/Dashboards/UserDashboard/ClaimSubmission";
import ClaimTracker from "@/components/general/Dashboards/UserDashboard/ClaimTracker";
import AppealSection from "@/components/general/Dashboards/UserDashboard/AppealSection";
import NotificationPanel from "@/components/general/NotificationPanel";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "@/hooks/use-toast";
import { useSearchParams } from 'react-router-dom';
// import ClaimRecords from "@/components/general/dashboards/UserDashboard/ClaimRecords";

const PolicyHolderDashMain = () => {
  const validTabs = ["dashboard", "policy", "submit", "track", "appeals"];
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(validTabs.includes(initialTab || "") ? initialTab || "dashboard" : "dashboard");
  // const claims = [{
  //   id: "CLM-2024-001",
  //   type: "Auto Accident",
  //   status: "under-review",
  //   amount: 2500,
  //   submittedDate: "2024-01-15",
  //   lastUpdate: "Policy review in progress"
  // },
  // {
  //   id: "CLM-2024-002",
  //   type: "Medical",
  //   status: "accepted",
  //   amount: 1800,
  //   submittedDate: "2024-01-10",
  //   lastUpdate: "Claim settled - payment processed"
  // }];
  

  const [ClaimsData, setClaimsData] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const previousStatusesRef = useRef<Record<string, string>>({});
  const hasInitialClaimsRef = useRef(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
  } = useNotifications();

  const claimStatusLabel = useMemo(
    () => ({
      Instantiated: "Created",
      Submitted: "Submitted",
      UnderReview: "Under Review",
      Escalated: "Escalated",
      Settled: "Settled",
      Rejected: "Rejected",
    }),
    []
  );

  //Claim History fetch
  useEffect(() => {
    const fetchClaimHistory = async () => {
    try {
      const base_url = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
      const response = await fetch(`${base_url}/claim/getAllClaims`, {
        method : 'GET',
        headers : {
          'token' : localStorage.getItem("JWT")
        }
      });
      if(response.ok){
      const data = await response.json();
      const incomingClaims = Array.isArray(data?.data) ? data.data : [];

      const nextStatuses: Record<string, string> = {};
      incomingClaims.forEach((item: any) => {
        const claimId = item?.claim?._id;
        const status = item?.claim?.status;
        if (!claimId || !status) return;
        nextStatuses[claimId] = status;

        if (hasInitialClaimsRef.current) {
          const previousStatus = previousStatusesRef.current[claimId];
          if (previousStatus && previousStatus !== status) {
            toast({
              title: "Claim status updated",
              description: `Claim ${claimId.slice(-6)} is now ${claimStatusLabel[status as keyof typeof claimStatusLabel] || status}.`,
            });
          }
        }
      });

      previousStatusesRef.current = nextStatuses;
      hasInitialClaimsRef.current = true;

      setClaimsData(incomingClaims);
      console.log("Claims fetched");
      console.log(data.data);
      }
      else{
        console.log("Response error : ", response.status);
        setClaimsData([]); // Set empty array on error
      }
    } catch (error) {
      console.error(error);
      setClaimsData([]); // Set empty array on error
    }
  };
  fetchClaimHistory();
  const interval = setInterval(fetchClaimHistory, 15000);

  return () => clearInterval(interval);
  
  }, [claimStatusLabel]);

  const [userDet,setuserDet] = useState({
    name:'',
    phone : '',
    email : '',
    dob: '',
    aadhar : '',
    address : '',
    pan : ''
  });

  useEffect(()=>{
    try {
      const userData = localStorage.getItem('user_dets');
      if (userData) {
        setuserDet(JSON.parse(userData));
        console.log("Parsed!");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  },[])

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', activeTab);
      setSearchParams(nextParams, { replace: true });
      return;
    }

    if (!validTabs.includes(tab)) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', 'dashboard');
      setSearchParams(nextParams, { replace: true });
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
      }
      return;
    }

    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab, setSearchParams]);

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextTab);
    setSearchParams(nextParams, { replace: true });
  };


  // const { toast } = useToast();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Settled":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "UnderReview":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "Escalated":
        return <AlertTriangle className="h-4 w-4 text-purple-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Settled":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "UnderReview":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Escalated":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Submitted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Instantiated":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-3 lg:px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-700 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">InsuranceSaathi</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setShowNotifications((prev) => !prev)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <div className="text-sm">
                <p className="font-medium text-gray-900">{userDet?.name}</p>
                <p className="text-gray-500">Policy: POL-2024-12345</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showNotifications && (
          <NotificationPanel
            notifications={notifications}
            onMarkRead={markAsRead}
            onDelete={deleteNotification}
            onNavigate={(url) => {
              if (!url) return;
              window.location.href = url;
            }}
          />
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full p-4">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="policy">My Policy</TabsTrigger>
            <TabsTrigger value="submit">Submit Claim</TabsTrigger>
            <TabsTrigger value="track">Track Claims</TabsTrigger>
            <TabsTrigger value="appeals">Appeals</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Claims</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">{ClaimsData?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">+1 from last month</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Settled Claims</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {ClaimsData?.filter((item)=>item?.claim?.status === "Settled").length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Settled with insurer</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                  <Clock className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {ClaimsData?.filter((item)=>item?.claim?.status === "UnderReview").length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Avg. 5-7 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Policy Coverage</CardTitle>
                  <Shield className="h-4 w-4 text-blue-700" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">85%</div>
                  <p className="text-xs text-muted-foreground">Utilized this year</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Claims */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Claims Activity</CardTitle>
                <CardDescription>Your latest insurance claims and their current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ClaimsData && ClaimsData.length > 0 ? (
                    ClaimsData.map((claim,index) => (
                      <div key={claim?.claim?._id || index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(claim?.claim?.status || '')}
                          <div>
                            <p className="font-medium">{`CLM - 00${index+1}`} - {claim?.claim?.policyType || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{claim?.claim?.createdAt || ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(claim?.claim?.status || '')}>
                            {(claim?.claim?.status || '').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No claims found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policy">
            <PolicySection />
          </TabsContent>

          <TabsContent value="submit">
            <ClaimSubmission />
          </TabsContent>

          <TabsContent value="track">
            <ClaimTracker />
          </TabsContent>

          <TabsContent value="appeals">
            <AppealSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PolicyHolderDashMain;