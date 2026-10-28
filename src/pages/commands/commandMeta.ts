import {
  AudioLines,
  Crown,
  Download,
  Hash,
  Image,
  Info,
  Music,
  PartyPopper,
  Puzzle,
  Search,
  Server,
  Shield,
  Sparkles,
  Tags,
  User,
  Wand2,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { TranslationKey } from '@/i18n';
import { enabledCommandVariants } from '@/lib/commandAvailability';
import { commandPath as commandPathFor, commandTypeFromPath } from '@/lib/commandPaths';
import { CommandCategories, CommandTypes, LegacyCommandCategories, type Command, type CommandMetadata, type CommandPremium, type CommandStat, type CommandType } from '@/lib/api';


export interface TypeOption {
  param: string,
  label: TranslationKey,
  types: Array<CommandType> | null,
}

export const TYPE_OPTIONS: Array<TypeOption> = [
  {param: 'all', label: 'common.all', types: null},
  {param: 'prefixed', label: 'command_type.prefixed', types: [CommandTypes.PREFIXED]},
  {param: 'slash', label: 'command_type.slash', types: [CommandTypes.APPLICATION_SLASH]},
  {param: 'context', label: 'command_type.context', types: [CommandTypes.APPLICATION_MENU_USER, CommandTypes.APPLICATION_MENU_MESSAGE]},
];

export function typeOptionFromParam(param: string | null): TypeOption {
  // older links/saved filters used separate message/user values
  if (param === 'message' || param === 'user') {
    param = 'context';
  }
  return TYPE_OPTIONS.find((option) => option.param === param) || TYPE_OPTIONS[0];
}


export const PREFIXES: Record<CommandType, string> = {
  [CommandTypes.PREFIXED]: '.',
  [CommandTypes.APPLICATION_SLASH]: '/',
  [CommandTypes.APPLICATION_MENU_USER]: '',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: '',
};

export const TYPE_LABELS: Record<CommandType, TranslationKey> = {
  [CommandTypes.PREFIXED]: 'command_type.prefixed',
  [CommandTypes.APPLICATION_SLASH]: 'command_type.slash',
  [CommandTypes.APPLICATION_MENU_USER]: 'command_type.user_menu',
  [CommandTypes.APPLICATION_MENU_MESSAGE]: 'command_type.message_menu',
};


// a premium command's badge, and who it's for (the drawer's explanation)
export function premiumMeta(premium: CommandPremium): {badge: TranslationKey, label: TranslationKey, description: TranslationKey} {
  return {
    badge: `command_premium.${premium}.badge`,
    label: `command_premium.${premium}.label`,
    description: `command_premium.${premium}.description`,
  };
}

export const ACCESS_OPTIONS = [
  {value: 'all', label: 'common.all'},
  {value: 'free', label: 'command_access.free'},
  {value: 'premium', label: 'command_access.premium'},
] as const;
export type Access = (typeof ACCESS_OPTIONS)[number]['value'];

export function accessFromParam(param: string | null): Access {
  return (param === 'free' || param === 'premium') ? param : 'all';
}

export function matchesAccess(metadata: CommandMetadata, access: Access): boolean {
  return access === 'all' || (access === 'premium') === !!metadata.premium;
}


export interface CategoryMeta {
  label: TranslationKey,
  icon: LucideIcon,
  // used through inline CSS vars, so arbitrary hex values are fine
  color: string,
}

// Order here is the sidebar order (roughly by how much they're used).
export const CATEGORY_META: Record<string, CategoryMeta> = {
  [CommandCategories.CONVERSION]: {label: 'category.CONVERSION', icon: Download, color: '#22c55e'},
  [CommandCategories.AI]: {label: 'category.AI', icon: Sparkles, color: '#a78bfa'},
  [CommandCategories.EFFECTS]: {label: 'category.EFFECTS', icon: Wand2, color: '#ec4899'},
  [CommandCategories.TAGS]: {label: 'category.TAGS', icon: Tags, color: '#f59e0b'},
  [CommandCategories.SEARCH]: {label: 'category.SEARCH', icon: Search, color: '#3b82f6'},
  [CommandCategories.AUDIO]: {label: 'category.AUDIO', icon: AudioLines, color: '#14b8a6'},
  [CommandCategories.FUN]: {label: 'category.FUN', icon: PartyPopper, color: '#fb923c'},
  [CommandCategories.INFO]: {label: 'category.INFO', icon: Info, color: '#38bdf8'},
  [CommandCategories.MODERATION]: {label: 'category.MODERATION', icon: Shield, color: '#ef4444'},
  [CommandCategories.MUSIC]: {label: 'category.MUSIC', icon: Music, color: '#e11d48'},
  [CommandCategories.SERVER]: {label: 'category.SERVER', icon: Server, color: '#94a3b8'},
  [CommandCategories.PERSONAL]: {label: 'category.PERSONAL', icon: User, color: '#c084fc'},
  [CommandCategories.UTILITY]: {label: 'category.UTILITY', icon: Puzzle, color: '#eab308'},
  [CommandCategories.OWNER]: {label: 'category.OWNER', icon: Crown, color: '#a855f7'},

  // legacy values, only seen until the bot re-uploads its commands; hidden once unused
  [LegacyCommandCategories.IMAGE]: {label: 'category.IMAGE', icon: Image, color: '#ec4899'},
  [LegacyCommandCategories.TOOLS]: {label: 'category.TOOLS', icon: Wrench, color: '#22c55e'},
  [LegacyCommandCategories.SETTINGS]: {label: 'category.SETTINGS', icon: Server, color: '#94a3b8'},
  [LegacyCommandCategories.UTILS]: {label: 'category.UTILS', icon: Puzzle, color: '#eab308'},
  [LegacyCommandCategories.SAY]: {label: 'category.SAY', icon: Hash, color: '#14b8a6'},
};

// never listed on the public page
export const HIDDEN_CATEGORIES: ReadonlySet<string> = new Set([CommandCategories.OWNER]);

const UNKNOWN_CATEGORY: CategoryMeta = {label: 'category.OTHER', icon: Hash, color: '#72767d'};

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] || UNKNOWN_CATEGORY;
}

// alphabetical by label in the language on screen
export function categoryOrder(label: (key: TranslationKey) => string): Array<string> {
  return Object.keys(CATEGORY_META)
    .filter((category) => !HIDDEN_CATEGORIES.has(category))
    .sort((a, b) => label(CATEGORY_META[a].label).localeCompare(label(CATEGORY_META[b].label)));
}


// one way to run a command (prefix, slash, a context menu) and its uses in the stats window (0 when unused or unknown)
export interface Variant {
  metadata: CommandMetadata,
  uses: number,
}

// One card: a command's prefix and slash variants share one (they're the same command typed two ways), each context
// menu gets its own since it's used differently.
export interface Entry {
  key: string,
  command: Command,
  // the variant the card shows, the prefix one when there is one
  metadata: CommandMetadata,
  // sorted by type, so prefix before slash
  variants: Array<Variant>,
  // slash/context metadata has no category of its own; borrow it from a sibling
  category: string,
  // all of its variants' uses together
  uses: number,
  // 1-based popularity rank among all entries with uses, null when unused
  rank: number | null,
}


const MERGED_TYPES: ReadonlySet<CommandType> = new Set([CommandTypes.PREFIXED, CommandTypes.APPLICATION_SLASH]);


export function entryKey(commandId: string, type: CommandType): string {
  return `${commandId}:${type}`;
}


// every variant a command is offered as, filters aside (what its paths are worked out from)
function commandTypes(command: Command): Array<CommandType> {
  return enabledCommandVariants(command).filter((metadata) => metadata.name).map((metadata) => metadata.type);
}

export function commandPath(command: Command, type: CommandType): string {
  return commandPathFor(command.id, type, commandTypes(command));
}

// the entry (and which of its variants) a /commands/:commandId(/:commandType) path points at, undefined for an unknown
// command or type
export function entryFromPath(entries: Array<Entry>, commandId: string, slug: string | undefined): {entry: Entry, type: CommandType} | undefined {
  const command = entries.find((entry) => entry.command.id === commandId)?.command;
  const type = (command) ? commandTypeFromPath(slug, commandTypes(command)) : undefined;
  if (type === undefined) {
    return undefined;
  }
  const entry = entries.find((item) => item.command.id === commandId && item.variants.some((variant) => variant.metadata.type === type));
  return (entry) ? {entry, type} : undefined;
}


// `include` narrows the variants first (type, DMs, free/premium), so a card's uses are only the ones that match
export function buildEntries(
  commands: Array<Command>,
  stats: Array<CommandStat> | undefined,
  include?: (metadata: CommandMetadata) => boolean,
): Array<Entry> {
  const usage = new Map<string, number>();
  for (const stat of stats || []) {
    const key = entryKey(stat.id, stat.type);
    usage.set(key, (usage.get(key) || 0) + stat.count);
  }

  // disabled commands/variants (removed from the bot) aren't listed, so their pages act like unknown commands
  const entries: Array<Entry> = [];
  for (const command of commands) {
    // a disabled sibling can still lend its category
    const fallbackCategory = command.metadata.find((x) => x.category)?.category || '';
    const variants = enabledCommandVariants(command)
      .filter((metadata) => metadata.name && (!include || include(metadata)))
      .sort((x, y) => x.type - y.type);
    const merged = variants.filter((metadata) => MERGED_TYPES.has(metadata.type));
    const groups = [ merged, ...variants.filter((metadata) => !MERGED_TYPES.has(metadata.type)).map((metadata) => [metadata]) ];
    for (const group of groups) {
      if (!group.length) {
        continue;
      }
      const [ metadata ] = group;
      const category = metadata.category || fallbackCategory;
      if (HIDDEN_CATEGORIES.has(category)) {
        continue;
      }
      const entryVariants = group.map((item) => ({metadata: item, uses: usage.get(entryKey(command.id, item.type)) || 0}));
      entries.push({
        key: entryKey(command.id, metadata.type),
        command,
        metadata,
        variants: entryVariants,
        category,
        uses: entryVariants.reduce((sum, variant) => sum + variant.uses, 0),
        rank: null,
      });
    }
  }

  const ranked = entries.filter((entry) => entry.uses).sort((x, y) => y.uses - x.uses);
  ranked.forEach((entry, i) => {
    entry.rank = i + 1;
  });
  return entries;
}


export function compareByName(x: Entry, y: Entry): number {
  return x.metadata.name.localeCompare(y.metadata.name) || x.metadata.type - y.metadata.type;
}

export function compareByUses(x: Entry, y: Entry): number {
  return (y.uses - x.uses) || compareByName(x, y);
}
