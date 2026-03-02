import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackupCard } from "./BackupCard";
import { BackupDestinationCard } from "./BackupDestinationCard";
import { HomeHeader } from "./HomeHeader";
import { HomeModals } from "./HomeModals";
import type { HomeViewModel } from "../types";

export function HomeView({
  contactsCount,
  messagesCount,
  callLogsCount,
  loading,
  refreshing,
  isUploadingVcf,
  backupPath,
  session,
  successModal,
  cloudLoadingMessage,
  cloudUploadVisible,
  cloudUploadName,
  cloudUploadCaseId,
  onRefresh,
  onCopyPath,
  onCloseSuccessModal,
  onBackupContacts,
  onBackupMessages,
  onBackupCallLogs,
  onRestoreContacts,
  onRestoreMessages,
  onRestoreCallLogs,
  onOpenProfile,
  onOpenLocalBackups,
  onOpenLogin,
  onCloudUploadSubmit,
  onCloudUploadCancel,
  onCloudUploadClose,
  onCloudUploadNameChange,
  onCloudUploadCaseIdChange,
}: HomeViewModel) {
  const isBusy = loading || isUploadingVcf;

  return (
    <SafeAreaView className="flex-1 bg-[#050a17]" edges={["top", "bottom"]}>
      <HomeModals
        successModal={successModal}
        cloudLoadingMessage={cloudLoadingMessage}
        cloudUploadVisible={cloudUploadVisible}
        cloudUploadName={cloudUploadName}
        cloudUploadCaseId={cloudUploadCaseId}
        isUploadingVcf={isUploadingVcf}
        onCopyPath={onCopyPath}
        onCloseSuccessModal={onCloseSuccessModal}
        onCloudUploadSubmit={onCloudUploadSubmit}
        onCloudUploadCancel={onCloudUploadCancel}
        onCloudUploadClose={onCloudUploadClose}
        onCloudUploadNameChange={onCloudUploadNameChange}
        onCloudUploadCaseIdChange={onCloudUploadCaseIdChange}
      />

      <View className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#0d2a4d]/60" />
      <View className="absolute -left-24 top-52 h-56 w-56 rounded-full bg-[#0f3a37]/40" />

      <HomeHeader
        session={session}
        onOpenProfile={onOpenProfile}
        onOpenLocalBackups={onOpenLocalBackups}
        onOpenLogin={onOpenLogin}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 28,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#38bdf8"
          />
        }
      >
        <BackupDestinationCard backupPath={backupPath} />

        <BackupCard
          icon="people"
          label="Contacts"
          count={contactsCount}
          onBackup={onBackupContacts}
          onRestore={onRestoreContacts}
          loading={isBusy}
          accentBg="bg-[#132e4f]"
          accentText="#7dd3fc"
        />

        <BackupCard
          icon="chatbubbles"
          label="Messages"
          count={messagesCount}
          onBackup={onBackupMessages}
          onRestore={onRestoreMessages}
          loading={isBusy}
          accentBg="bg-[#10302a]"
          accentText="#5eead4"
        />

        <BackupCard
          icon="call"
          label="Call Logs"
          count={callLogsCount}
          onBackup={onBackupCallLogs}
          onRestore={onRestoreCallLogs}
          loading={isBusy}
          accentBg="bg-[#35280f]"
          accentText="#fbbf24"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
