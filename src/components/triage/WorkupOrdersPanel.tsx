import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Clipboard,
    Zap,
    FlaskConical,
    Scan,
    Pill,
    Activity,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ESILevel } from '@/types/triage';

interface OrderCategory {
    name: string;
    icon: typeof FlaskConical;
    orders: string[];
}

interface OrderProtocol {
    name: string;
    description: string;
    categories: OrderCategory[];
}

// ESI-based order protocols
const ORDER_PROTOCOLS: Record<'critical' | 'urgent' | 'standard', OrderProtocol> = {
    critical: {
        name: 'Critical/Emergent Protocol',
        description: 'ESI 1-2: Immediate assessment orders',
        categories: [
            {
                name: 'Labs',
                icon: FlaskConical,
                orders: ['CBC', 'BMP', 'Cardiac Enzymes (Troponin)', 'Coagulation Panel (PT/INR/PTT)', 'Lactate', 'ABG', 'Type & Screen']
            },
            {
                name: 'Imaging',
                icon: Scan,
                orders: ['12-Lead ECG', 'Chest X-Ray (Portable)', 'CT Head (if AMS)', 'CT Angiography (if PE suspected)']
            },
            {
                name: 'Medications',
                icon: Pill,
                orders: ['IV Access (18G or larger)', 'NS 1L Bolus', 'Aspirin 325mg (chest pain protocol)', 'Ondansetron 4mg IV PRN']
            },
            {
                name: 'Monitoring',
                icon: Activity,
                orders: ['Continuous Cardiac Telemetry', 'Continuous Pulse Oximetry', 'Vitals q5min', 'Foley Catheter (strict I/O)']
            }
        ]
    },
    urgent: {
        name: 'Urgent Protocol',
        description: 'ESI 3: Standard workup orders',
        categories: [
            {
                name: 'Labs',
                icon: FlaskConical,
                orders: ['CBC', 'BMP', 'Urinalysis', 'Lipase (abdominal pain)', 'Pregnancy Test (if applicable)']
            },
            {
                name: 'Imaging',
                icon: Scan,
                orders: ['X-Ray (site specific)', 'Ultrasound (if indicated)', 'CT Abdomen/Pelvis (if indicated)']
            },
            {
                name: 'Medications',
                icon: Pill,
                orders: ['IV Access', 'NS 500mL', 'Pain Management PRN', 'Anti-emetic PRN']
            }
        ]
    },
    standard: {
        name: 'Standard Protocol',
        description: 'ESI 4-5: Basic workup orders',
        categories: [
            {
                name: 'Labs',
                icon: FlaskConical,
                orders: ['CBC', 'BMP', 'Urinalysis']
            },
            {
                name: 'Imaging',
                icon: Scan,
                orders: ['X-Ray (if indicated)']
            }
        ]
    }
};

interface WorkupOrdersPanelProps {
    esiLevel: ESILevel;
    selectedOrders: string[];
    onOrdersChange: (orders: string[]) => void;
    disabled?: boolean;
}

export function WorkupOrdersPanel({
    esiLevel,
    selectedOrders,
    onOrdersChange,
    disabled = false
}: WorkupOrdersPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Select protocol based on ESI level
    const protocolKey = useMemo(() => {
        if (esiLevel <= 2) return 'critical';
        if (esiLevel === 3) return 'urgent';
        return 'standard';
    }, [esiLevel]);

    const protocol = ORDER_PROTOCOLS[protocolKey];

    const handleOrderToggle = (order: string) => {
        if (disabled) return;

        if (selectedOrders.includes(order)) {
            onOrdersChange(selectedOrders.filter(o => o !== order));
        } else {
            onOrdersChange([...selectedOrders, order]);
        }
    };

    const handleSelectAll = () => {
        if (disabled) return;

        const allOrders = protocol.categories.flatMap(cat => cat.orders);
        if (selectedOrders.length === allOrders.length) {
            onOrdersChange([]);
        } else {
            onOrdersChange(allOrders);
        }
    };

    const handleSelectCategory = (categoryOrders: string[]) => {
        if (disabled) return;

        const allSelected = categoryOrders.every(o => selectedOrders.includes(o));
        if (allSelected) {
            onOrdersChange(selectedOrders.filter(o => !categoryOrders.includes(o)));
        } else {
            const newOrders = [...new Set([...selectedOrders, ...categoryOrders])];
            onOrdersChange(newOrders);
        }
    };

    const allOrders = protocol.categories.flatMap(cat => cat.orders);
    const isAllSelected = allOrders.length > 0 && allOrders.every(o => selectedOrders.includes(o));

    return (
        <Card className={cn(
            "clinical-card",
            esiLevel <= 2 && "border-esi-1/30 bg-esi-1/5"
        )}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clipboard className={cn(
                            "h-4 w-4",
                            esiLevel <= 2 ? "text-esi-1" : "text-primary"
                        )} />
                        <CardTitle className="text-sm font-medium">
                            Workup Orders
                        </CardTitle>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-xs",
                                esiLevel <= 2 && "border-esi-1/50 text-esi-1"
                            )}
                        >
                            {protocol.name}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedOrders.length > 0 && (
                            <Badge className="bg-primary/10 text-primary">
                                {selectedOrders.length} selected
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="h-8 w-8 p-0"
                        >
                            {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">{protocol.description}</p>
            </CardHeader>

            {isExpanded && (
                <CardContent className="pt-0">
                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 mb-4">
                        <Button
                            variant={esiLevel <= 2 ? "default" : "outline"}
                            size="sm"
                            onClick={handleSelectAll}
                            disabled={disabled}
                            className={cn(
                                "gap-1.5",
                                esiLevel <= 2 && "bg-esi-1 hover:bg-esi-1/90"
                            )}
                        >
                            <Zap className="h-3.5 w-3.5" />
                            {isAllSelected ? 'Clear All' : 'Select Standard Workup'}
                        </Button>
                        {selectedOrders.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onOrdersChange([])}
                                disabled={disabled}
                            >
                                Clear Selection
                            </Button>
                        )}
                    </div>

                    {/* Order Categories */}
                    <div className="space-y-4">
                        {protocol.categories.map((category) => {
                            const Icon = category.icon;
                            const categorySelected = category.orders.filter(o => selectedOrders.includes(o)).length;
                            const allCategorySelected = category.orders.every(o => selectedOrders.includes(o));

                            return (
                                <div key={category.name}>
                                    <div
                                        className="flex items-center gap-2 mb-2 cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => handleSelectCategory(category.orders)}
                                    >
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{category.name}</span>
                                        {categorySelected > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                                {categorySelected}/{category.orders.length}
                                            </Badge>
                                        )}
                                        <Checkbox
                                            checked={allCategorySelected}
                                            className="ml-auto"
                                            disabled={disabled}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 ml-6">
                                        {category.orders.map((order) => (
                                            <label
                                                key={order}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer transition-colors",
                                                    selectedOrders.includes(order)
                                                        ? "bg-primary/10 text-primary"
                                                        : "hover:bg-muted",
                                                    disabled && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                <Checkbox
                                                    checked={selectedOrders.includes(order)}
                                                    onCheckedChange={() => handleOrderToggle(order)}
                                                    disabled={disabled}
                                                />
                                                <span className="truncate">{order}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {category !== protocol.categories[protocol.categories.length - 1] && (
                                        <Separator className="mt-3" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

export default WorkupOrdersPanel;
