/**
 * GhostGeist Frontend: Engineering Shadow Work Triage
 * Built with Forge UI Kit 2 (@forge/react)
 */
import React, { useState, useEffect, useCallback } from 'react';
import ForgeReconciler, {
  Box,
  Stack,
  Inline,
  Heading,
  Text,
  Badge,
  Lozenge,
  Button,
  LoadingButton,
  Link,
  DynamicTable,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalTransition,
  SectionMessage,
  SectionMessageAction,
  EmptyState,
  Spinner,
  Textfield,
  TextArea,
  useProductContext
} from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const projectKey = context?.extension?.project?.key || 'GHOST';
  const siteUrl = context?.siteUrl || 'https://ghostgeist.atlassian.net';

  // Config State
  const [config, setConfig] = useState({
    owner: '',
    repo: '',
    hasGithubToken: false,
    hasGeminiApiKey: false,
    usingBuiltInGeminiKey: false,
    isConfigured: false
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    owner: '',
    repo: '',
    githubToken: '',
    geminiApiKey: ''
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Data & Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [prs, setPrs] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    untrackedCount: 0,
    trackedCount: 0,
    totalShadowPoints: 0
  });
  const [hasScanned, setHasScanned] = useState(false);

  // Active Triage / Reconciliation State
  const [selectedPr, setSelectedPr] = useState(null);
  const [triageData, setTriageData] = useState(null);
  const [isTriagingPr, setIsTriagingPr] = useState(false);
  const [isTriagingAll, setIsTriagingAll] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields inside Triage Modal
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIssueType, setEditIssueType] = useState('Task');
  const [editPoints, setEditPoints] = useState(2);
  const [editReason, setEditReason] = useState('');

  // Notifications
  const [successBanner, setSuccessBanner] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Load initial config
  const loadConfig = useCallback(async () => {
    try {
      const cfg = await invoke('getConfig');
      if (cfg) {
        setConfig(cfg);
        setSettingsForm({
          owner: cfg.owner || '',
          repo: cfg.repo || '',
          githubToken: '',
          geminiApiKey: ''
        });
      }
    } catch (err) {
      console.warn('Failed to load initial configuration:', err.message);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Scan PRs
  const handleScanPRs = async (overrideConfig) => {
    const activeCfg = overrideConfig || config;
    if (!activeCfg.owner || !activeCfg.repo) {
      setIsSettingsOpen(true);
      setErrorMessage('Please configure GitHub Owner and Repository in Settings before scanning.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);

    try {
      const result = await invoke('scanUntrackedPRs', {
        owner: activeCfg.owner,
        repo: activeCfg.repo,
        projectKey
      });

      if (result && result.success) {
        const loadedPrs = result.prs || [];
        setPrs(loadedPrs);
        setStats(result.stats || {
          totalCount: 0,
          untrackedCount: loadedPrs.length,
          trackedCount: 0,
          totalShadowPoints: 0
        });
        setHasScanned(true);

        // Auto-triage the first untriaged PR in the background if Gemini is configured
        const untriaged = loadedPrs.filter((p) => !p.triage);
        if (activeCfg.hasGeminiApiKey && untriaged.length > 0) {
          const topPr = untriaged[0];
          invoke('triageSinglePR', {
            pr: topPr,
            owner: activeCfg.owner,
            repo: activeCfg.repo,
            projectKey
          }).then((res) => {
            if (res && res.success && res.triage) {
              setPrs((prev) =>
                prev.map((item) => (item.id === topPr.id ? { ...item, triage: res.triage } : item))
              );
              setStats((prev) => ({
                ...prev,
                totalShadowPoints: prev.totalShadowPoints + (res.triage.estimatedStoryPoints || 0)
              }));
            }
          }).catch((err) => {
            console.warn('Background auto-triage notice:', err.message);
          });
        }
      }
    } catch (err) {
      setErrorMessage(`Scanning failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setIsSavingConfig(true);
    setErrorMessage(null);

    try {
      const result = await invoke('saveConfig', {
        owner: settingsForm.owner,
        repo: settingsForm.repo,
        githubToken: settingsForm.githubToken,
        geminiApiKey: settingsForm.geminiApiKey
      });

      if (result && result.success) {
        setConfig(result.config);
        setSettingsForm((prev) => ({
          ...prev,
          githubToken: '',
          geminiApiKey: ''
        }));
        setIsSettingsOpen(false);
        // Automatically trigger a scan with the newly saved configuration
        handleScanPRs(result.config);
      }
    } catch (err) {
      setErrorMessage(`Failed to save settings: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Open Analysis Modal & Triage on Demand
  const handleOpenTriageModal = async (pr) => {
    setSelectedPr(pr);
    setIsModalOpen(true);
    setErrorMessage(null);

    if (pr.triage) {
      setTriageData(pr.triage);
      setEditTitle(pr.triage.suggestedTitle || pr.title);
      setEditDescription(pr.triage.suggestedDescription || pr.body || '');
      setEditIssueType(pr.triage.issueType || 'Task');
      setEditPoints(pr.triage.estimatedStoryPoints || 2);
      setEditReason(pr.triage.reason || '');
      return;
    }

    // Run triage with Gemini if not already triaged
    setIsTriagingPr(true);
    try {
      const res = await invoke('triageSinglePR', {
        pr,
        owner: config.owner,
        repo: config.repo,
        projectKey
      });

      if (res && res.success && res.triage) {
        setTriageData(res.triage);
        setEditTitle(res.triage.suggestedTitle || pr.title);
        setEditDescription(res.triage.suggestedDescription || pr.body || '');
        setEditIssueType(res.triage.issueType || 'Task');
        setEditPoints(res.triage.estimatedStoryPoints || 2);
        setEditReason(res.triage.reason || '');

        // Update the PR in state with the new triage result
        setPrs((prev) =>
          prev.map((item) => (item.id === pr.id ? { ...item, triage: res.triage } : item))
        );
        setStats((prev) => ({
          ...prev,
          totalShadowPoints: prev.totalShadowPoints + (res.triage.estimatedStoryPoints || 0)
        }));
      }
    } catch (err) {
      setErrorMessage(`Gemini Triage Error: ${err.message || 'Check your Gemini API Key.'}`);
      // Fallback pre-filled values
      setEditTitle(pr.title || '');
      setEditDescription(pr.body || '');
      setEditIssueType('Task');
      setEditPoints(2);
      setEditReason('Manual reconciliation');
    } finally {
      setIsTriagingPr(false);
    }
  };

  // Batch triage all untriaged PRs
  const handleTriageAll = async () => {
    setIsTriagingAll(true);
    setErrorMessage(null);

    try {
      const untriaged = prs.filter((p) => !p.triage);
      for (const pr of untriaged) {
        try {
          const res = await invoke('triageSinglePR', {
            pr,
            owner: config.owner,
            repo: config.repo,
            projectKey
          });

          if (res && res.success && res.triage) {
            setPrs((prev) =>
              prev.map((item) => (item.id === pr.id ? { ...item, triage: res.triage } : item))
            );
            setStats((prev) => ({
              ...prev,
              totalShadowPoints: prev.totalShadowPoints + (res.triage.estimatedStoryPoints || 0)
            }));
          }
        } catch (itemErr) {
          console.warn(`Triage failed for PR #${pr.number}:`, itemErr.message);
        }
      }
    } catch (err) {
      setErrorMessage(`Batch triage failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsTriagingAll(false);
    }
  };

  // Quick Reconcile (creates Jira ticket directly)
  const handleReconcileDirect = async (pr) => {
    setSelectedPr(pr);
    setIsReconciling(true);
    setErrorMessage(null);

    let triage = pr.triage;
    if (!triage && config.hasGeminiApiKey) {
      try {
        const triageRes = await invoke('triageSinglePR', {
          pr,
          owner: config.owner,
          repo: config.repo,
          projectKey
        });
        if (triageRes && triageRes.success && triageRes.triage) {
          triage = triageRes.triage;
        }
      } catch (err) {
        console.warn(`Direct triage warning on PR #${pr.number}: ${err.message}`);
      }
    }

    const title = triage?.suggestedTitle || pr.title;
    const description = triage?.suggestedDescription || pr.body || `Reconciled from GitHub PR #${pr.number}`;
    const issueType = triage?.issueType || 'Task';
    const estimatedPoints = triage?.estimatedStoryPoints || 2;
    const reason = triage?.reason || '';

    try {
      const res = await invoke('createJiraIssue', {
        projectKey,
        summary: title,
        description,
        issueType,
        prUrl: pr.html_url,
        prNumber: pr.number,
        author: pr.user?.login,
        estimatedPoints,
        reason
      });

      if (res && res.success && res.issue) {
        const fullBrowseUrl = siteUrl.startsWith('http')
          ? `${siteUrl}/browse/${res.issue.key}`
          : `https://${siteUrl}/browse/${res.issue.key}`;

        setSuccessBanner({
          key: res.issue.key,
          url: fullBrowseUrl,
          prNumber: pr.number
        });

        // Remove reconciled PR from the untracked list
        setPrs((prev) => prev.filter((item) => item.id !== pr.id));
        setStats((prev) => ({
          ...prev,
          untrackedCount: Math.max(0, prev.untrackedCount - 1),
          trackedCount: prev.trackedCount + 1,
          totalShadowPoints: Math.max(0, prev.totalShadowPoints - estimatedPoints)
        }));
      }
    } catch (err) {
      setErrorMessage(`Failed to reconcile issue: ${err.message || 'Unknown error'}`);
    } finally {
      setIsReconciling(false);
    }
  };

  // Reconcile from Modal
  const handleReconcileFromModal = async () => {
    if (!selectedPr) return;
    setIsReconciling(true);
    setErrorMessage(null);

    try {
      const res = await invoke('createJiraIssue', {
        projectKey,
        summary: editTitle,
        description: editDescription,
        issueType: editIssueType,
        prUrl: selectedPr.html_url,
        prNumber: selectedPr.number,
        author: selectedPr.user?.login,
        estimatedPoints: Number(editPoints) || 2,
        reason: editReason
      });

      if (res && res.success && res.issue) {
        const fullBrowseUrl = siteUrl.startsWith('http')
          ? `${siteUrl}/browse/${res.issue.key}`
          : `https://${siteUrl}/browse/${res.issue.key}`;

        setSuccessBanner({
          key: res.issue.key,
          url: fullBrowseUrl,
          prNumber: selectedPr.number
        });

        // Remove reconciled PR from untracked list
        setPrs((prev) => prev.filter((item) => item.id !== selectedPr.id));
        setStats((prev) => ({
          ...prev,
          untrackedCount: Math.max(0, prev.untrackedCount - 1),
          trackedCount: prev.trackedCount + 1,
          totalShadowPoints: Math.max(0, prev.totalShadowPoints - (Number(editPoints) || 0))
        }));

        setIsModalOpen(false);
      }
    } catch (err) {
      setErrorMessage(`Failed to create Jira issue: ${err.message || 'Unknown error'}`);
    } finally {
      setIsReconciling(false);
    }
  };

  // Helper for Lozenge appearance based on issueType
  const getLozengeAppearance = (type) => {
    switch (type) {
      case 'Bug':
        return 'removed';
      case 'Story':
        return 'success';
      case 'Task':
      default:
        return 'inprogress';
    }
  };

  // Table Configuration
  const tableHead = {
    cells: [
      { key: 'pr', content: 'Pull Request' },
      { key: 'author', content: 'Author' },
      { key: 'classification', content: 'AI Classification' },
      { key: 'suggestedTitle', content: 'AI Suggested Ticket Title' },
      { key: 'actions', content: 'Actions' }
    ]
  };

  const tableRows = prs.map((pr) => {
    const isThisPrReconciling = isReconciling && selectedPr?.id === pr.id;

    return {
      key: String(pr.id || pr.number),
      cells: [
        {
          key: 'pr',
          content: (
            <Stack space="space.050">
              <Link href={pr.html_url} openInNewTab>
                {`#${pr.number} ${pr.title}`}
              </Link>
              <Text size="small">{`Branch: ${pr.head?.ref || 'main'}`}</Text>
            </Stack>
          )
        },
        {
          key: 'author',
          content: <Text>{`@${pr.user?.login || 'unknown'}`}</Text>
        },
        {
          key: 'classification',
          content: pr.triage ? (
            <Inline space="space.050" alignBlock="center">
              <Lozenge appearance={getLozengeAppearance(pr.triage.issueType)}>
                {pr.triage.issueType}
              </Lozenge>
              <Badge appearance="primary">
                {`${pr.triage.estimatedStoryPoints || 1} pts`}
              </Badge>
            </Inline>
          ) : (
            <Lozenge appearance="default">Untriaged</Lozenge>
          )
        },
        {
          key: 'suggestedTitle',
          content: (
            <Text>
              {pr.triage?.suggestedTitle ? pr.triage.suggestedTitle : pr.title}
            </Text>
          )
        },
        {
          key: 'actions',
          content: (
            <Inline space="space.050">
              <Button
                appearance="subtle"
                spacing="compact"
                isDisabled={isReconciling || isTriagingAll}
                onClick={() => handleOpenTriageModal(pr)}
              >
                View AI Analysis
              </Button>
              <LoadingButton
                appearance="primary"
                spacing="compact"
                isLoading={isThisPrReconciling}
                isDisabled={isReconciling || isTriagingAll}
                onClick={() => handleReconcileDirect(pr)}
              >
                Reconcile to Jira
              </LoadingButton>
            </Inline>
          )
        }
      ]
    };
  });

  return (
    <Box padding="space.300">
      <Stack space="space.300">
        {/* Header Section */}
        <Inline spread="space-between" alignBlock="center">
          <Stack space="space.050">
            <Heading as="h1">GhostGeist: Engineering Shadow Work Triage</Heading>
            <Text color="color.text.subtle">
              Detect unmonitored GitHub code commits and reconcile shadow PRs into first-class Jira work items.
            </Text>
          </Stack>
          <Inline space="space.100">
            <Button
              appearance="default"
              onClick={() => setIsSettingsOpen(true)}
            >
              Settings
            </Button>
            <LoadingButton
              appearance="primary"
              isLoading={isScanning}
              onClick={() => handleScanPRs()}
            >
              Scan PRs
            </LoadingButton>
          </Inline>
        </Inline>

        {/* Success Alert Banner */}
        {successBanner && (
          <SectionMessage
            appearance="success"
            title={`Successfully reconciled PR #${successBanner.prNumber} to Jira!`}
            actions={[
              <SectionMessageAction
                key="dismiss"
                onClick={() => setSuccessBanner(null)}
              >
                Dismiss
              </SectionMessageAction>
            ]}
          >
            <Inline space="space.050" alignBlock="center">
              <Text>Created Issue: </Text>
              <Link href={successBanner.url} openInNewTab>
                {`${successBanner.key} (${successBanner.url})`}
              </Link>
            </Inline>
          </SectionMessage>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <SectionMessage
            appearance="error"
            title="Action Failed"
            actions={[
              <SectionMessageAction
                key="dismiss-err"
                onClick={() => setErrorMessage(null)}
              >
                Dismiss
              </SectionMessageAction>
            ]}
          >
            <Text>{errorMessage}</Text>
          </SectionMessage>
        )}

        {/* Summary Stat Cards */}
        <Inline space="space.200" spread="space-between" grow="fill">
          <Box
            padding="space.200"
            backgroundColor="color.background.neutral.subtle"
            borderRadius="border.radius.100"
          >
            <Stack space="space.050">
              <Text color="color.text.subtle">Untracked Shadow PRs</Text>
              <Inline space="space.100" alignBlock="center">
                <Heading as="h2">{stats.untrackedCount}</Heading>
                <Lozenge appearance={stats.untrackedCount > 0 ? 'removed' : 'success'}>
                  {stats.untrackedCount > 0 ? 'Action Needed' : 'All Tracked'}
                </Lozenge>
              </Inline>
            </Stack>
          </Box>

          <Box
            padding="space.200"
            backgroundColor="color.background.neutral.subtle"
            borderRadius="border.radius.100"
          >
            <Stack space="space.050">
              <Text color="color.text.subtle">Estimated Shadow Points</Text>
              <Inline space="space.100" alignBlock="center">
                <Heading as="h2">{stats.totalShadowPoints}</Heading>
                <Badge appearance="primary">pts</Badge>
              </Inline>
            </Stack>
          </Box>

          <Box
            padding="space.200"
            backgroundColor="color.background.neutral.subtle"
            borderRadius="border.radius.100"
          >
            <Stack space="space.050">
              <Text color="color.text.subtle">Target Jira Project</Text>
              <Inline space="space.100" alignBlock="center">
                <Heading as="h2">{projectKey}</Heading>
                <Lozenge appearance="inprogress">
                  {config.owner && config.repo ? `${config.owner}/${config.repo}` : 'Not configured'}
                </Lozenge>
              </Inline>
            </Stack>
          </Box>
        </Inline>

        {/* Main Content Area */}
        {isScanning ? (
          <Box padding="space.500" alignSelf="center">
            <Stack space="space.100" alignInline="center">
              <Spinner size="large" />
              <Text>Scanning GitHub repository and triaging untracked work with Gemini AI...</Text>
            </Stack>
          </Box>
        ) : hasScanned && prs.length === 0 ? (
          <EmptyState
            header="Zero Shadow Work Detected!"
            description="All pull requests in this repository are linked to Jira issue keys. Engineering velocity is 100% visible."
          />
        ) : !hasScanned ? (
          <EmptyState
            header="Ready to Audit Engineering Shadow Work"
            description="Configure your GitHub repository and click 'Scan PRs' to detect unlinked pull requests and let Gemini AI generate Jira tickets."
            primaryAction={
              <Button appearance="primary" isDisabled={isScanning} onClick={() => handleScanPRs()}>
                Scan Open PRs
              </Button>
            }
          />
        ) : (
          <Stack space="space.100">
            <Inline spread="space-between" alignBlock="center">
              <Heading as="h3">Untracked Pull Requests ({prs.length})</Heading>
              {prs.some((p) => !p.triage) && (
                <LoadingButton
                  appearance="default"
                  isLoading={isTriagingAll}
                  isDisabled={isTriagingAll || isReconciling || isScanning}
                  onClick={handleTriageAll}
                >
                  Triage All with Gemini
                </LoadingButton>
              )}
            </Inline>
            <DynamicTable
              head={tableHead}
              rows={tableRows}
              isLoading={isScanning}
              emptyView={<Text>No untracked pull requests found.</Text>}
            />
          </Stack>
        )}

        {/* Triage / AI Analysis Modal */}
        <ModalTransition>
          {isModalOpen && selectedPr && (
            <Modal onClose={() => setIsModalOpen(false)}>
              <ModalHeader>
                <ModalTitle>
                  {`Gemini AI Triage: PR #${selectedPr.number}`}
                </ModalTitle>
              </ModalHeader>
              <ModalBody>
                {isTriagingPr ? (
                  <Box padding="space.400">
                    <Stack space="space.150" alignInline="center">
                      <Spinner size="medium" />
                      <Text>Analyzing code changes and synthesizing ticket with Gemini AI...</Text>
                    </Stack>
                  </Box>
                ) : (
                  <Stack space="space.200">
                    {/* Duplicate / Related Jira Issue Callout */}
                    {triageData?.matchedExistingIssueKey ? (
                      <SectionMessage
                        appearance="warning"
                        title="Potential Duplicate / Related Jira Issue"
                      >
                        <Text>
                          {`Gemini spotted that this PR may relate to existing issue ${triageData.matchedExistingIssueKey}.`}
                        </Text>
                      </SectionMessage>
                    ) : null}

                    {/* Reason / Analysis Callout */}
                    {editReason ? (
                      <SectionMessage appearance="information" title="Gemini Architecture Rationale">
                        <Text>{editReason}</Text>
                      </SectionMessage>
                    ) : null}

                    {/* Ticket Title */}
                    <Stack space="space.050">
                      <Text>Suggested Ticket Title</Text>
                      <Textfield
                        name="suggestedTitle"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Concise Jira issue summary"
                      />
                    </Stack>

                    {/* Issue Type & Points */}
                    <Inline space="space.200" spread="space-between">
                      <Stack space="space.050">
                        <Text>Issue Type</Text>
                        <Inline space="space.050">
                          {['Task', 'Bug', 'Story'].map((t) => (
                            <Button
                              key={t}
                              spacing="compact"
                              appearance={editIssueType === t ? 'primary' : 'default'}
                              onClick={() => setEditIssueType(t)}
                            >
                              {t}
                            </Button>
                          ))}
                        </Inline>
                      </Stack>
                      <Stack space="space.050">
                        <Text>Estimated Story Points</Text>
                        <Inline space="space.050">
                          {[1, 2, 3, 5, 8].map((pts) => (
                            <Button
                              key={pts}
                              spacing="compact"
                              appearance={editPoints === pts ? 'primary' : 'default'}
                              onClick={() => setEditPoints(pts)}
                            >
                              {`${pts} pts`}
                            </Button>
                          ))}
                        </Inline>
                      </Stack>
                    </Inline>

                    {/* Description */}
                    <Stack space="space.050">
                      <Text>Detailed Description</Text>
                      <TextArea
                        name="suggestedDescription"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        minimumRows={6}
                        placeholder="Comprehensive technical description"
                      />
                    </Stack>

                    {/* PR Link Reference */}
                    <Text size="small" color="color.text.subtle">
                      {`Source: PR #${selectedPr.number} (${selectedPr.html_url}) opened by @${selectedPr.user?.login || 'unknown'}`}
                    </Text>
                  </Stack>
                )}
              </ModalBody>
              <ModalFooter>
                <Button appearance="subtle" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <LoadingButton
                  appearance="primary"
                  isLoading={isReconciling}
                  onClick={handleReconcileFromModal}
                >
                  Create Jira Issue & Link PR
                </LoadingButton>
              </ModalFooter>
            </Modal>
          )}
        </ModalTransition>

        {/* Settings Modal */}
        <ModalTransition>
          {isSettingsOpen && (
            <Modal onClose={() => setIsSettingsOpen(false)}>
              <ModalHeader>
                <ModalTitle>GhostGeist App Settings</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <Stack space="space.200">
                  <Text color="color.text.subtle">
                    Configure your target GitHub repository and Google Gemini AI Studio API key.
                  </Text>

                  <Stack space="space.050">
                    <Text>GitHub Repository Owner</Text>
                    <Textfield
                      name="owner"
                      placeholder="e.g. facebook or octocat"
                      value={settingsForm.owner}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, owner: e.target.value }))
                      }
                    />
                  </Stack>

                  <Stack space="space.050">
                    <Text>GitHub Repository Name</Text>
                    <Textfield
                      name="repo"
                      placeholder="e.g. react or ghostgeist-demo"
                      value={settingsForm.repo}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, repo: e.target.value }))
                      }
                    />
                  </Stack>

                  <Stack space="space.050">
                    <Text>
                      GitHub Personal Access Token (PAT) {config.hasGithubToken ? '(configured)' : '(Optional for public repos)'}
                    </Text>
                    <Textfield
                      name="githubToken"
                      type="password"
                      placeholder={config.hasGithubToken ? "(configured)" : "ghp_..."}
                      value={settingsForm.githubToken}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, githubToken: e.target.value }))
                      }
                    />
                  </Stack>

                  <Stack space="space.050">
                    <Text>
                      Google Gemini API Key {
                        config.usingBuiltInGeminiKey
                          ? '(Optional — Built-in Judge Demo Key Active)'
                          : config.hasGeminiApiKey
                            ? '(Optional — Custom Key Configured)'
                            : '(Required for AI Triage)'
                      }
                    </Text>
                    <Textfield
                      name="geminiApiKey"
                      type="password"
                      placeholder={
                        config.usingBuiltInGeminiKey
                          ? '(Optional — Built-in Judge Demo Key Active)'
                          : config.hasGeminiApiKey
                            ? '(configured)'
                            : 'AIzaSy...'
                      }
                      value={settingsForm.geminiApiKey}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, geminiApiKey: e.target.value }))
                      }
                    />
                  </Stack>
                </Stack>
              </ModalBody>
              <ModalFooter>
                <Button appearance="subtle" onClick={() => setIsSettingsOpen(false)}>
                  Cancel
                </Button>
                <LoadingButton
                  appearance="primary"
                  isLoading={isSavingConfig}
                  onClick={handleSaveSettings}
                >
                  Save & Scan
                </LoadingButton>
              </ModalFooter>
            </Modal>
          )}
        </ModalTransition>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
