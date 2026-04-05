'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { Building, MapPin, Layers, ArrowLeft, Upload, Pencil, Box, Home, ChevronDown, ChevronRight, Settings, Car } from 'lucide-react';
import { useBuilding } from '@/hooks/use-buildings';
import { useApartments } from '@/hooks/use-apartments';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FloorPlan } from '@/components/maps/floor-plan';
import { ApartmentDetailPanel } from '@/components/maps/apartment-detail-panel';
import { MapControls } from '@/components/maps/map-controls';
import { SvgUploadDialog } from '@/components/maps/svg-upload-dialog';
import { SvgBuilderDialog } from '@/components/maps/svg-builder-dialog';
import { Building3D, Building3DLegend } from '@/components/3d';
import { BuildingPoliciesTab, BuildingParkingTab } from '@/components/buildings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function BuildingDetailPage() {
  const params = useParams();
  const buildingId = params.id as string;

  const { data: buildingData, isLoading: buildingLoading, refetch: refetchBuilding } = useBuilding(buildingId);
  const { data: apartmentsData, isLoading: apartmentsLoading } = useApartments({ buildingId, limit: 500 });
  
  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [svgUploadOpen, setSvgUploadOpen] = useState(false);
  const [svgBuilderOpen, setSvgBuilderOpen] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set());

  // Role-based access control
  const { hasAnyRole } = useAuthStore();
  const canEditBuilding = hasAnyRole(['admin', 'technician']);

  const building = buildingData?.data;
  const apartments = apartmentsData?.data || [];

  // Create apartment statuses for 3D viewer (includes floor for per-apartment coloring)
  const apartmentStatuses = useMemo(() => {
    return apartments.map(apt => ({
      svgElementId: apt.svgElementId || apt.id,
      floorIndex: apt.floorIndex,
      status: apt.status as 'vacant' | 'occupied' | 'maintenance' | 'reserved',
    }));
  }, [apartments]);

  // Group apartments by floor
  const apartmentsByFloor = useMemo(() => {
    const grouped = new Map<number, typeof apartments>();
    apartments.forEach((apt) => {
      const floor = apt.floorIndex;
      if (!grouped.has(floor)) {
        grouped.set(floor, []);
      }
      grouped.get(floor)!.push(apt);
    });
    // Sort each floor's apartments by unit number
    grouped.forEach((apts) => {
      apts.sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }));
    });
    return grouped;
  }, [apartments]);

  const toggleFloor = (floor: number) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floor)) {
        next.delete(floor);
      } else {
        next.add(floor);
      }
      return next;
    });
  };

  // Calculate apartment counts by status
  const apartmentCounts = {
    total: apartments.length,
    vacant: apartments.filter((a) => a.status === 'vacant').length,
    occupied: apartments.filter((a) => a.status === 'occupied').length,
    maintenance: apartments.filter((a) => a.status === 'maintenance').length,
    reserved: apartments.filter((a) => a.status === 'reserved').length,
  };

  const selectedApartment = apartments.find((a) => a.id === selectedApartmentId) || null;

  const handleApartmentClick = (apartmentId: string) => {
    setSelectedApartmentId(apartmentId);
    setDetailPanelOpen(true);
  };

  if (buildingLoading || apartmentsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Skeleton className="h-[600px] w-full" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Building className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Building Not Found</h2>
        <p className="text-muted-foreground mb-4">The building you're looking for doesn't exist.</p>
        <Button asChild>
          <a href="/buildings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Buildings
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Button variant="ghost" size="sm" asChild>
              <a href="/buildings">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Buildings
              </a>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building className="h-8 w-8" />
            {building.name}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {building.address}, {building.city}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              {building.floorCount} floors
            </span>
          </div>
        </div>
        
        {/* Floor Plan Actions - Only show for admin/technician */}
        {canEditBuilding && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                {building.svgMapData ? (
                  <>
                    <Pencil className="mr-2 h-4 w-4" />
                    Manage Floor Plan
                  </>
                ) : (
                  <>
                    <Building className="mr-2 h-4 w-4" />
                    Add Floor Plan
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSvgBuilderOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                {building.svgMapData ? 'Edit with Builder' : 'Build Floor Plan'}
              </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSvgUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {building.svgMapData ? 'Replace SVG File' : 'Upload SVG File'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apartmentCounts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Occupied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {apartmentCounts.occupied}
            </div>
            <p className="text-xs text-muted-foreground">
              {apartmentCounts.total > 0
                ? Math.round((apartmentCounts.occupied / apartmentCounts.total) * 100)
                : 0}
              % occupancy
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vacant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {apartmentCounts.vacant}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {apartmentCounts.maintenance}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map and Controls */}
      <Tabs defaultValue="2d" className="space-y-4">
        <TabsList>
          <TabsTrigger value="2d" className="gap-2">
            <MapPin className="h-4 w-4" />
            2D Floor Plan
          </TabsTrigger>
          <TabsTrigger value="3d" className="gap-2" disabled={!building.svgMapData}>
            <Box className="h-4 w-4" />
            3D Building View
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2">
            <Settings className="h-4 w-4" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="parking" className="gap-2">
            <Car className="h-4 w-4" />
            Parking
          </TabsTrigger>
        </TabsList>

        {/* 2D Floor Plan Tab */}
        <TabsContent value="2d" className="space-y-0">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Floor Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-3"
            >
              <FloorPlan
                svgContent={building.svgMapData || ''}
                buildingId={building.id}
                apartments={apartments}
                onApartmentClick={handleApartmentClick}
              />
            </motion.div>

            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <MapControls
                floorCount={building.floorCount}
                apartmentCounts={apartmentCounts}
              />
            </motion.div>
          </div>
        </TabsContent>

        {/* 3D Building View Tab */}
        <TabsContent value="3d" className="space-y-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[700px] relative"
          >
            {building.svgMapData ? (
              <>
                <Building3D
                  svgContent={building.svgMapData}
                  totalFloors={building.floorCount}
                  buildingName={building.name}
                  floorHeights={building.floorHeights}
                  apartmentStatuses={apartmentStatuses}
                  className="h-full"
                />
                <Building3DLegend className="absolute bottom-4 left-4 z-10" />
              </>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center space-y-4">
                  <Box className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">No Floor Plan Available</h3>
                    <p className="text-muted-foreground mb-4">
                      Create or upload a floor plan to view the 3D building model
                    </p>
                    <Button onClick={() => setSvgBuilderOpen(true)}>
                      <Building className="mr-2 h-4 w-4" />
                      Build Floor Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        {/* Building Policies Tab */}
        <TabsContent value="policies" className="space-y-0">
          <BuildingPoliciesTab buildingId={buildingId} />
        </TabsContent>

        {/* Parking Management Tab */}
        <TabsContent value="parking" className="space-y-0">
          <BuildingParkingTab buildingId={buildingId} />
        </TabsContent>
      </Tabs>

      {/* Floor-based Apartment List */}
      {apartments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Apartments by Floor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: building.floorCount }, (_, i) => i + 1).map((floor) => {
                const floorApartments = apartmentsByFloor.get(floor) || [];
                const isExpanded = expandedFloors.has(floor);
                const occupiedCount = floorApartments.filter(a => a.status === 'occupied').length;
                const vacantCount = floorApartments.filter(a => a.status === 'vacant').length;

                return (
                  <div key={floor} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleFloor(floor)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Layers className="h-4 w-4" />
                        <span className="font-medium">Floor {floor}</span>
                        <Badge variant="secondary" className="ml-1">
                          {floorApartments.length} unit{floorApartments.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {occupiedCount > 0 && (
                          <Badge variant="default" className="text-xs">
                            {occupiedCount} occupied
                          </Badge>
                        )}
                        {vacantCount > 0 && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                            {vacantCount} vacant
                          </Badge>
                        )}
                      </div>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t px-4 py-2 space-y-1">
                            {floorApartments.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">No apartments on this floor</p>
                            ) : (
                              floorApartments.map((apt) => (
                                <button
                                  key={apt.id}
                                  onClick={() => handleApartmentClick(apt.id)}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    <Home className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">Unit {apt.unit_number}</span>
                                    {apt.grossArea && (
                                      <span className="text-xs text-muted-foreground">
                                        {Number(apt.grossArea).toFixed(0)}m²
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {apt.bedroomCount}BR / {apt.bathroomCount}BA
                                    </span>
                                  </div>
                                  <Badge
                                    variant={
                                      apt.status === 'vacant' ? 'outline' :
                                      apt.status === 'occupied' ? 'default' :
                                      apt.status === 'maintenance' ? 'secondary' : 'outline'
                                    }
                                    className={
                                      apt.status === 'vacant' ? 'text-green-600 border-green-300' :
                                      apt.status === 'maintenance' ? 'text-yellow-600' : ''
                                    }
                                  >
                                    {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                  </Badge>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}


      {/* SVG Upload Dialog */}
      <SvgUploadDialog
        buildingId={buildingId}
        buildingName={building.name}
        open={svgUploadOpen}
        onOpenChange={setSvgUploadOpen}
        onUploadSuccess={() => {
          refetchBuilding();
        }}
      />

      {/* SVG Builder Dialog */}
      <SvgBuilderDialog
        buildingId={buildingId}
        buildingName={building.name}
        existingSvg={building.svgMapData || undefined}
        open={svgBuilderOpen}
        onOpenChange={setSvgBuilderOpen}
        onSaveSuccess={() => {
          refetchBuilding();
        }}
      />

      {/* Apartment Detail Panel */}
      <ApartmentDetailPanel
        apartment={selectedApartment}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
      />
    </div>
  );
}
