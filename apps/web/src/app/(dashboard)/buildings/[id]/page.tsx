'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { Building, MapPin, Layers, ArrowLeft, Upload, Pencil, Box, Home, Search, Eye, Settings, Car, Users } from 'lucide-react';
import { useBuilding } from '@/hooks/use-buildings';
import { useApartments } from '@/hooks/use-apartments';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FloorPlan } from '@/components/maps/floor-plan';
import { ApartmentDetailPanel } from '@/components/maps/apartment-detail-panel';
import { MapControls } from '@/components/maps/map-controls';
import { SvgUploadDialog } from '@/components/maps/svg-upload-dialog';
import { SvgBuilderDialog } from '@/components/maps/svg-builder-dialog';
import { Building3D, Building3DLegend } from '@/components/3d';
import { BuildingPoliciesTab, BuildingParkingTab } from '@/components/buildings';
import { BuildingStaffTab } from '@/components/buildings/building-staff-tab';
import { FloorUnitsDialog } from '@/components/buildings/floor-units-dialog';
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
  const [floorDialogOpen, setFloorDialogOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [floorSearch, setFloorSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('floor-asc');

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
    grouped.forEach((apts) => {
      apts.sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }));
    });
    return grouped;
  }, [apartments]);

  // Build floor stats for the grid
  const floorStats = useMemo(() => {
    return Array.from({ length: building?.floorCount ?? 0 }, (_, i) => i + 1).map((floor) => {
      const apts = apartmentsByFloor.get(floor) || [];
      const occupied = apts.filter(a => a.status === 'occupied').length;
      const vacant = apts.filter(a => a.status === 'vacant').length;
      const maintenance = apts.filter(a => a.status === 'maintenance').length;
      const total = apts.length;
      const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
      return { floor, total, occupied, vacant, maintenance, occupancyPct };
    });
  }, [apartmentsByFloor, building?.floorCount]);

  // Filtered + sorted floor stats
  const filteredFloorStats = useMemo(() => {
    let result = floorStats;

    // Search by floor number or unit number
    if (floorSearch.trim()) {
      const q = floorSearch.trim().toLowerCase();
      result = result.filter(fs => {
        if (String(fs.floor).includes(q)) return true;
        const apts = apartmentsByFloor.get(fs.floor) || [];
        return apts.some(a => a.unit_number.toLowerCase().includes(q));
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(fs => {
        const apts = apartmentsByFloor.get(fs.floor) || [];
        return apts.some(a => a.status === statusFilter);
      });
    }

    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case 'floor-desc':
        sorted.sort((a, b) => b.floor - a.floor);
        break;
      case 'occupancy-desc':
        sorted.sort((a, b) => b.occupancyPct - a.occupancyPct);
        break;
      case 'occupancy-asc':
        sorted.sort((a, b) => a.occupancyPct - b.occupancyPct);
        break;
      case 'vacant-desc':
        sorted.sort((a, b) => b.vacant - a.vacant);
        break;
      default: // floor-asc
        sorted.sort((a, b) => a.floor - b.floor);
    }
    return sorted;
  }, [floorStats, floorSearch, statusFilter, sortBy, apartmentsByFloor]);

  const handleViewFloorUnits = (floor: number) => {
    setSelectedFloor(floor);
    setFloorDialogOpen(true);
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
          <TabsTrigger value="staff" className="gap-2">
            <Users className="h-4 w-4" />
            Staff
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
          <BuildingPoliciesTab buildingId={buildingId} readOnly={!canEditBuilding} />
        </TabsContent>

        {/* Parking Management Tab */}
        <TabsContent value="parking" className="space-y-0">
          <BuildingParkingTab buildingId={buildingId} />
        </TabsContent>

        {/* Staff Management Tab */}
        <TabsContent value="staff" className="space-y-0">
          <BuildingStaffTab buildingId={buildingId} />
        </TabsContent>
      </Tabs>

      {/* Floor Grid */}
      {apartments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Section Header + Filters */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Home className="h-5 w-5" />
              Apartments by Floor
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search floor or unit..."
                value={floorSearch}
                onChange={(e) => setFloorSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="floor-asc">Floor ↑</SelectItem>
                <SelectItem value="floor-desc">Floor ↓</SelectItem>
                <SelectItem value="occupancy-desc">Occupancy ↓</SelectItem>
                <SelectItem value="occupancy-asc">Occupancy ↑</SelectItem>
                <SelectItem value="vacant-desc">Most vacant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Floor Cards Grid */}
          {filteredFloorStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No floors match your search.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFloorStats.map((fs) => {
                const occupancyColor =
                  fs.occupancyPct >= 90 ? 'text-red-500' :
                  fs.occupancyPct >= 70 ? 'text-yellow-500' :
                  'text-green-500';

                return (
                  <Card key={fs.floor} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      {/* Floor number + total */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xl font-bold">F{fs.floor}</span>
                        </div>
                        <Badge variant="secondary">{fs.total} units</Badge>
                      </div>

                      {/* Occupancy bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Occupancy</span>
                          <span className={`font-semibold ${occupancyColor}`}>{fs.occupancyPct}%</span>
                        </div>
                        <Progress value={fs.occupancyPct} className="h-2" />
                      </div>

                      {/* Status breakdown */}
                      <div className="flex items-center gap-2 text-xs">
                        {fs.occupied > 0 && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">{fs.occupied} occ</Badge>
                        )}
                        {fs.vacant > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-300">{fs.vacant} vac</Badge>
                        )}
                        {fs.maintenance > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-yellow-600">{fs.maintenance} mnt</Badge>
                        )}
                      </div>

                      {/* View button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleViewFloorUnits(fs.floor)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View {fs.total} unit{fs.total !== 1 ? 's' : ''}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Floor Units Dialog */}
      <FloorUnitsDialog
        open={floorDialogOpen}
        onOpenChange={setFloorDialogOpen}
        floor={selectedFloor ?? 0}
        apartments={selectedFloor ? (apartmentsByFloor.get(selectedFloor) || []) : []}
        onApartmentClick={handleApartmentClick}
      />


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
