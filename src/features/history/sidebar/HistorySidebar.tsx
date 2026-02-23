import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { GestureResponderHandlers } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatBackupDate, formatSize } from "@/services/backup";
import { GlassPanel } from "@/components/GlassPanel";
import type { AuthSession } from "@/services/auth/sessionStorage";
import type { BackupRecord } from "@/types/backup";
import type { HistoryTab } from "@/features/history/types";
import { getBackupPresentation } from "@/features/history/shared/backupPresentation";

export function HistorySidebar({
  visible,
  session,
  activeTab,
  recentBackups,
  panHandlers,
  onClose,
  onSignOut,
  onCloudLogin,
  onSelectTab,
  onDeleteBackup,
}: {
  visible: boolean;
  session: AuthSession | null;
  activeTab: HistoryTab;
  recentBackups: BackupRecord[];
  panHandlers: GestureResponderHandlers;
  onClose: () => void;
  onSignOut: () => void;
  onCloudLogin: () => void;
  onSelectTab: (tab: HistoryTab) => void;
  onDeleteBackup: (item: BackupRecord) => void;
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1">
        <Pressable className="flex-1 bg-black/60" onPress={onClose} />
        <View
          {...panHandlers}
          className="absolute left-0 top-0 bottom-0 w-[84%] max-w-[330px]"
        >
          <GlassPanel
            className="flex-1 rounded-r-3xl border-r border-[#1f2e42]"
            contentStyle={{
              flex: 1,
              paddingHorizontal: 16,
              paddingTop: 56,
              paddingBottom: 24,
            }}
          >
            <View className="absolute -top-14 -left-8 w-40 h-40 rounded-full bg-[#12385e]/40" />
            <View className="absolute top-32 -right-10 w-28 h-28 rounded-full bg-[#173852]/35" />
            <ScrollView
              {...panHandlers}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <GlassPanel className="w-9 h-9 rounded-xl border-[#23324a]">
                  <Pressable
                    onPress={onClose}
                    className="w-9 h-9 items-center justify-center active:opacity-80"
                  >
                    <Ionicons name="chevron-back" size={20} color="#e2e8f0" />
                  </Pressable>
                </GlassPanel>
                <Text className="text-white text-xl font-bold">History</Text>
                <View className="w-9 h-9" />
              </View>

              {session ? (
                <GlassPanel
                  className="mb-4 rounded-2xl border-[#1f2937]"
                  contentStyle={{ padding: 16 }}
                >
                  <View className="flex-row items-center">
                    <View className="w-11 h-11 rounded-full bg-[#0d2d2c] items-center justify-center mr-3">
                      <Ionicons
                        name="person-circle-outline"
                        size={22}
                        color="#22c55e"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[#e2e8f0] text-base font-semibold">
                        {session.user.name}
                      </Text>
                      <Text className="text-[#94a3b8] text-xs mt-0.5">
                        {session.user.mobileNumber || "Mobile not available"}
                      </Text>
                      <Pressable onPress={onSignOut} className="mt-1.5">
                        <Text className="text-[#22c55e] text-xs font-semibold">
                          SIGN OUT
                        </Text>
                      </Pressable>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#64748b"
                    />
                  </View>
                </GlassPanel>
              ) : (
                <GlassPanel
                  className="mb-4 rounded-2xl border-[#1f2937]"
                  contentStyle={{ padding: 16 }}
                >
                  <View className="flex-row items-center">
                    <View className="w-11 h-11 rounded-full bg-[#132e4f] items-center justify-center mr-3">
                      <Ionicons
                        name="cloud-outline"
                        size={21}
                        color="#7dd3fc"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[#e2e8f0] text-sm font-semibold">
                        Cloud Access
                      </Text>
                      <Text className="text-[#94a3b8] text-xs mt-0.5">
                        Login to use cloud backups
                      </Text>
                    </View>
                    <Pressable
                      onPress={onCloudLogin}
                      className="active:opacity-80"
                    >
                      <Text className="text-[#38bdf8] text-xs font-semibold">
                        LOGIN
                      </Text>
                    </Pressable>
                  </View>
                </GlassPanel>
              )}

              <GlassPanel
                className="mb-4 rounded-2xl border-[#2a384d]"
                contentStyle={{ padding: 4 }}
              >
                <View className="flex-row">
                  <Pressable
                    onPress={() => onSelectTab("local")}
                    className={`flex-1 rounded-xl py-2.5 ${activeTab === "local" ? "border border-[#3b82f6]/45 bg-[#1e293b]" : "bg-transparent"}`}
                  >
                    <Text
                      className="text-center text-sm font-semibold"
                      style={{
                        color: activeTab === "local" ? "#f8fafc" : "#cbd5e1",
                      }}
                    >
                      Local Backups
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onSelectTab("cloud")}
                    className={`flex-1 rounded-xl py-2.5 ${activeTab === "cloud" ? "border border-[#3b82f6]/45 bg-[#1e293b]" : "bg-transparent"}`}
                  >
                    <Text
                      className="text-center text-sm font-semibold"
                      style={{
                        color: activeTab === "cloud" ? "#f8fafc" : "#cbd5e1",
                      }}
                    >
                      Cloud Backups
                    </Text>
                  </Pressable>
                </View>
              </GlassPanel>

              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[#e2e8f0] text-[25px] font-bold">
                  {activeTab === "local" ? "Recent Backups" : "Cloud Backups"}
                </Text>
                <Pressable onPress={() => onSelectTab(activeTab)}>
                  <Text className="text-[#22c55e] text-xs font-semibold">
                    View All
                  </Text>
                </Pressable>
              </View>

              {recentBackups.length === 0 ? (
                <GlassPanel
                  className="items-center rounded-2xl border-dashed border-[#334155]"
                  contentStyle={{ paddingHorizontal: 16, paddingVertical: 32 }}
                >
                  <Ionicons name="archive-outline" size={24} color="#64748b" />
                  <Text className="text-[#94a3b8] text-xs mt-2">
                    {activeTab === "local"
                      ? "No local backups yet"
                      : "No cloud backups yet"}
                  </Text>
                </GlassPanel>
              ) : (
                recentBackups.map((item) => {
                  const data = getBackupPresentation(item);
                  return (
                    <GlassPanel
                      key={item.folderName}
                      className="mb-3 rounded-2xl border-[#1f2937]"
                      contentStyle={{ padding: 12 }}
                    >
                      <View className="flex-row items-center">
                        <View
                          className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${data.accentBg}`}
                        >
                          <Ionicons
                            name={data.iconName}
                            size={20}
                            color={data.accentText}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[#e2e8f0] text-base font-semibold">
                            {data.title}
                          </Text>
                          <Text className="text-[#94a3b8] text-xs mt-0.5">
                            {formatBackupDate(item.date)} •{" "}
                            {formatSize(item.sizeBytes)}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => onDeleteBackup(item)}
                          className="w-9 h-9 rounded-full bg-[#12253f] items-center justify-center active:opacity-80"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color="#f87171"
                          />
                        </Pressable>
                      </View>
                    </GlassPanel>
                  );
                })
              )}
            </ScrollView>
          </GlassPanel>
        </View>
      </View>
    </Modal>
  );
}
