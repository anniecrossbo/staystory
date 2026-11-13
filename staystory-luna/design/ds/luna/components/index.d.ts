import type * as React from 'react';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; icon?: string; iconRight?: string; loading?: boolean; block?: boolean }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { icon: string; label: string; variant?: 'primary' | 'ghost' | 'white'; size?: 'sm' | 'md' | 'lg' }
export declare function IconButton(props: IconButtonProps): React.ReactElement;
export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: string; error?: string; icon?: string; multiline?: boolean; caps?: boolean }
export declare function TextField(props: TextFieldProps): React.ReactElement;
export interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export declare function SearchField(props: SearchFieldProps): React.ReactElement;
export interface SelectProps { label?: string; options: { value: string; label: string }[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; placeholder?: string; open?: boolean; className?: string }
export declare function Select(props: SelectProps): React.ReactElement;
export interface MenuProps { items: ({ label: string; icon?: string; selected?: boolean; danger?: boolean; onClick?: () => void } | { sep: true } | { section: string })[]; className?: string }
export declare function Menu(props: MenuProps): React.ReactElement;
export interface ToggleProps { checked?: boolean; defaultChecked?: boolean; onChange?: (v: boolean) => void; size?: 'md' | 'sm'; label?: string; disabled?: boolean; 'aria-label'?: string }
export declare function Toggle(props: ToggleProps): React.ReactElement;
export interface CheckboxProps { checked?: boolean; defaultChecked?: boolean; indeterminate?: boolean; onChange?: (v: boolean) => void; label?: string; disabled?: boolean }
export declare function Checkbox(props: CheckboxProps): React.ReactElement;
export interface RadioProps { checked?: boolean; defaultChecked?: boolean; onChange?: (v: boolean) => void; label?: string; disabled?: boolean }
export declare function Radio(props: RadioProps): React.ReactElement;
export interface SegmentedControlProps { options: { value: string; label: string; count?: number; icon?: string }[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; size?: 'lg' | 'sm'; glass?: boolean; className?: string; 'aria-label'?: string }
export declare function SegmentedControl(props: SegmentedControlProps): React.ReactElement;
export interface TabsProps { tabs: { value: string; label: string }[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; className?: string }
export declare function Tabs(props: TabsProps): React.ReactElement;
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { selected?: boolean; defaultSelected?: boolean; onChange?: (v: boolean) => void; count?: number; icon?: string }
export declare function Chip(props: ChipProps): React.ReactElement;
export interface StepperProps { value?: number; defaultValue?: number; min?: number; max?: number; onChange?: (v: number) => void; 'aria-label'?: string }
export declare function Stepper(props: StepperProps): React.ReactElement;
export interface ProgressBarProps { value: number; tone?: 'success' | 'warning' | 'danger'; 'aria-label'?: string }
export declare function ProgressBar(props: ProgressBarProps): React.ReactElement;
export interface CalendarProps { year?: number; month?: number; today?: number; selected?: number; defaultSelected?: number; onSelect?: (day: number) => void; range?: [number, number]; className?: string }
export declare function Calendar(props: CalendarProps): React.ReactElement;
export interface TimeWheelProps { hour?: string; minute?: string; className?: string }
export declare function TimeWheel(props: TimeWheelProps): React.ReactElement;
export interface BadgeProps { tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'vip'; dot?: boolean; icon?: string; children?: React.ReactNode; className?: string }
export declare function Badge(props: BadgeProps): React.ReactElement;
export interface CountBadgeProps { tone?: 'warning' | 'danger' | 'neutral'; children?: React.ReactNode }
export declare function CountBadge(props: CountBadgeProps): React.ReactElement;
export interface TagProps { hue?: 'sky' | 'violet' | 'navy' | 'charcoal' | 'ochre' | 'moss' | 'plum' | 'clay'; children?: React.ReactNode }
export declare function Tag(props: TagProps): React.ReactElement;
export interface AvatarProps { initials: string; size?: 24 | 34 | 40 | 48; tone?: 'muted' | 'solid' | 'danger' | 'success'; name?: string }
export declare function Avatar(props: AvatarProps): React.ReactElement;
export interface AvatarRingProps { initials: string; progress: number; tone?: 'success' | 'warning' | 'danger'; size?: number; name?: string }
export declare function AvatarRing(props: AvatarRingProps): React.ReactElement;
export interface StatTileProps { label: string; value: React.ReactNode; tone?: 'success' | 'warning' | 'danger' }
export declare function StatTile(props: StatTileProps): React.ReactElement;
export interface WidgetProps { title?: string; subtitle?: string; count?: number | string; action?: React.ReactNode; children?: React.ReactNode; className?: string; style?: React.CSSProperties }
export declare function Widget(props: WidgetProps): React.ReactElement;
export interface PanelProps { children?: React.ReactNode; className?: string; style?: React.CSSProperties }
export declare function Panel(props: PanelProps): React.ReactElement;
export interface ListRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { leading?: React.ReactNode; title: string; meta?: string; trailing?: React.ReactNode; selected?: boolean; chevron?: boolean }
export declare function ListRow(props: ListRowProps): React.ReactElement;
export interface DataTableProps { columns: { key: string; label: string; align?: 'left' | 'right'; render?: (row: any) => React.ReactNode }[]; rows: any[]; zebra?: boolean; compact?: boolean; selectedIndex?: number }
export declare function DataTable(props: DataTableProps): React.ReactElement;
export interface AlertCardProps { tone?: 'danger' | 'warning' | 'success'; title: string; meta?: string; actions?: React.ReactNode; className?: string }
export declare function AlertCard(props: AlertCardProps): React.ReactElement;
export interface BannerProps { tone?: 'success' | 'warning' | 'danger'; title?: string; icon?: string; action?: React.ReactNode; children?: React.ReactNode }
export declare function Banner(props: BannerProps): React.ReactElement;
export interface EmptyStateProps { icon?: string; title: string; children?: React.ReactNode; action?: React.ReactNode }
export declare function EmptyState(props: EmptyStateProps): React.ReactElement;
export interface ErrorStateProps { title?: string; detail?: string; onRetry?: () => void; retrying?: boolean }
export declare function ErrorState(props: ErrorStateProps): React.ReactElement;
export interface SkeletonProps { variant?: 'text' | 'title' | 'rect' | 'circle'; width?: number | string; height?: number | string; className?: string; style?: React.CSSProperties }
export declare function Skeleton(props: SkeletonProps): React.ReactElement;
export interface ToastProps { tone?: 'success' | 'info' | 'warning' | 'danger'; action?: string; onAction?: () => void; children?: React.ReactNode; className?: string }
export declare function Toast(props: ToastProps): React.ReactElement;
export interface TooltipProps { children?: React.ReactNode }
export declare function Tooltip(props: TooltipProps): React.ReactElement;
export interface RoomChipProps { number: string; status?: 'ready' | 'cleaning' | 'progress' | 'dirty' | 'blocked' | 'oos' | 'cleaned'; stay?: 'occupied' | 'vacant' | 'oos' | 'checkin' | 'checkout' }
export declare function RoomChip(props: RoomChipProps): React.ReactElement;
export interface TaskPillProps { state?: 'scheduled' | 'progress' | 'risk' | 'deferred' | 'done' | 'cancelled' | 'pinned'; lifted?: boolean; children?: React.ReactNode }
export declare function TaskPill(props: TaskPillProps): React.ReactElement;
export interface KpiChipProps { value: number | string; total?: number | string; label: string; tone?: 'warning' | 'danger' }
export declare function KpiChip(props: KpiChipProps): React.ReactElement;
export interface KanbanCardProps { initials: string; name: string; dates?: string; place?: string; amount?: string }
export declare function KanbanCard(props: KanbanCardProps): React.ReactElement;
export interface ShiftCellProps { shift?: 'morning' | 'evening' | 'night'; label: string; time?: string }
export declare function ShiftCell(props: ShiftCellProps): React.ReactElement;
export interface BarChartProps { data: { label: string; value: number; tone?: 'danger' }[]; height?: number; 'aria-label'?: string }
export declare function BarChart(props: BarChartProps): React.ReactElement;
export interface LineChartProps { series: { name: string; values: number[]; color?: string }[]; labels?: string[]; height?: number; 'aria-label'?: string }
export declare function LineChart(props: LineChartProps): React.ReactElement;
export interface DonutChartProps { segments: { label: string; value: number; color?: string }[]; center?: React.ReactNode; sub?: string; size?: number; 'aria-label'?: string }
export declare function DonutChart(props: DonutChartProps): React.ReactElement;
export interface DockProps { items: { id: string; icon: string; label: string }[]; active?: string; defaultActive?: string; onSelect?: (id: string) => void; onOrb?: () => void; orb?: boolean; className?: string; 'aria-label'?: string }
export declare function Dock(props: DockProps): React.ReactElement;
export interface TopBarProps { fresh?: 'fresh' | 'stale'; refreshed?: string; time?: string; slot?: React.ReactNode; kpis?: { icon: string; tone?: 'success' | 'warning'; value: number | string }[]; user?: string; initials?: string; className?: string }
export declare function TopBar(props: TopBarProps): React.ReactElement;
export interface ModalProps { title: string; subtitle?: string; layout?: 'dialog' | 'sheet'; onClose?: (() => void) | null; footer?: React.ReactNode; children?: React.ReactNode; className?: string }
export declare function Modal(props: ModalProps): React.ReactElement;
export declare function Scrim(): React.ReactElement;
export interface SideSheetProps { title: string; subtitle?: string; onClose?: () => void; footer?: React.ReactNode; children?: React.ReactNode; className?: string }
export declare function SideSheet(props: SideSheetProps): React.ReactElement;
export interface BottomSheetProps { title: string; children?: React.ReactNode; className?: string }
export declare function BottomSheet(props: BottomSheetProps): React.ReactElement;
export interface OrbProps { size?: number; state?: 'idle' | 'listening' | 'muted'; mic?: boolean; onClick?: () => void; label?: string; className?: string }
export declare function Orb(props: OrbProps): React.ReactElement;
export declare function ListeningIndicator(): React.ReactElement;
export interface VoiceCardProps { state?: 'greeting' | 'listening' | 'reply' | 'typing'; onClose?: () => void; onSend?: () => void; children?: React.ReactNode; className?: string }
export declare function VoiceCard(props: VoiceCardProps): React.ReactElement;
export interface SpeechPillProps { children?: React.ReactNode; className?: string }
export declare function SpeechPill(props: SpeechPillProps): React.ReactElement;
export interface CommandMenuProps { sections: { label: string; items: { icon: string; label: string }[] }[]; placeholder?: string; onCollapse?: () => void; className?: string }
export declare function CommandMenu(props: CommandMenuProps): React.ReactElement;
export interface ChatBubbleProps { kind?: 'guest' | 'genie' | 'sent' | 'luna'; meta?: string; frosted?: boolean; children?: React.ReactNode }
export declare function ChatBubble(props: ChatBubbleProps): React.ReactElement;
export declare function DayLabel(props: { children?: React.ReactNode }): React.ReactElement;
export interface ComposerProps { placeholder?: string; className?: string }
export declare function Composer(props: ComposerProps): React.ReactElement;
export interface AISummaryProps { label?: string; title?: string; bullets?: string[]; next?: string }
export declare function AISummary(props: AISummaryProps): React.ReactElement;
export interface AIActionProps { title: string; body?: string; link?: string; onClick?: () => void }
export declare function AIAction(props: AIActionProps): React.ReactElement;
export interface ProvenanceTagProps { kind: 'inferred' | 'stated'; onConfirm?: () => void; onDismiss?: () => void }
export declare function ProvenanceTag(props: ProvenanceTagProps): React.ReactElement;
export interface LogoProps { variant?: 'outline' | 'filled'; size?: number; title?: string; className?: string }
export declare function Logo(props: LogoProps): React.ReactElement;
export declare function Wordmark(props: { size?: number }): React.ReactElement;
export interface IconProps { name: string; size?: number; fill?: boolean; label?: string; className?: string; style?: React.CSSProperties }
export declare function Icon(props: IconProps): React.ReactElement;
export interface FilterPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { selected?: boolean; defaultSelected?: boolean; onChange?: (v: boolean) => void; count?: number | string; tone?: 'danger'; size?: 'sm' }
export declare function FilterPill(props: FilterPillProps): React.ReactElement;
export interface TagDiscProps { tag?: 'escalated' | 'priority' | 'hold' | 'conflicted' | 'delayed' | 'reopened' | 'attention'; size?: 28 | 32; label?: string; className?: string }
export declare function TagDisc(props: TagDiscProps): React.ReactElement;
export interface TagClusterProps { tags: ('escalated' | 'priority' | 'hold' | 'conflicted' | 'delayed' | 'reopened' | 'attention')[]; children?: React.ReactNode; className?: string }
export declare function TagCluster(props: TagClusterProps): React.ReactElement;
declare global { interface Window { Luna: { Button: typeof Button,IconButton: typeof IconButton,TextField: typeof TextField,SearchField: typeof SearchField,Select: typeof Select,Menu: typeof Menu,Toggle: typeof Toggle,Checkbox: typeof Checkbox,Radio: typeof Radio,SegmentedControl: typeof SegmentedControl,Tabs: typeof Tabs,Chip: typeof Chip,Stepper: typeof Stepper,ProgressBar: typeof ProgressBar,Calendar: typeof Calendar,TimeWheel: typeof TimeWheel,Badge: typeof Badge,CountBadge: typeof CountBadge,Tag: typeof Tag,Avatar: typeof Avatar,AvatarRing: typeof AvatarRing,StatTile: typeof StatTile,Widget: typeof Widget,Panel: typeof Panel,ListRow: typeof ListRow,DataTable: typeof DataTable,AlertCard: typeof AlertCard,Banner: typeof Banner,EmptyState: typeof EmptyState,ErrorState: typeof ErrorState,Skeleton: typeof Skeleton,Toast: typeof Toast,Tooltip: typeof Tooltip,RoomChip: typeof RoomChip,TaskPill: typeof TaskPill,KpiChip: typeof KpiChip,KanbanCard: typeof KanbanCard,ShiftCell: typeof ShiftCell,BarChart: typeof BarChart,LineChart: typeof LineChart,DonutChart: typeof DonutChart,Dock: typeof Dock,TopBar: typeof TopBar,Modal: typeof Modal,SideSheet: typeof SideSheet,BottomSheet: typeof BottomSheet,Orb: typeof Orb,VoiceCard: typeof VoiceCard,SpeechPill: typeof SpeechPill,CommandMenu: typeof CommandMenu,ChatBubble: typeof ChatBubble,Composer: typeof Composer,AISummary: typeof AISummary,AIAction: typeof AIAction,ProvenanceTag: typeof ProvenanceTag,Logo: typeof Logo,Icon: typeof Icon,FilterPill: typeof FilterPill,TagDisc: typeof TagDisc,TagCluster: typeof TagCluster,Scrim: typeof Scrim,DayLabel: typeof DayLabel,ListeningIndicator: typeof ListeningIndicator,Wordmark: typeof Wordmark } } }
