---
layout: post
title: "PowerShell Automation Best Practices for Microsoft 365"
date: 2025-02-10
categories: [development, microsoft, automation]
tags: [powershell, microsoft-365, scripting, automation, best-practices]
author: Suleman Manji
---

# PowerShell Automation Best Practices for Microsoft 365

PowerShell has become an indispensable tool for Microsoft 365 administrators and developers, providing powerful capabilities for automating repetitive tasks, managing resources at scale, and implementing complex workflows. However, writing efficient, secure, and maintainable PowerShell scripts requires more than basic scripting knowledge.

In this article, I'll share best practices and patterns that I've developed over years of creating PowerShell automation for enterprise Microsoft 365 environments.

## Modular Script Design

One of the most important aspects of maintainable PowerShell automation is modular design. Breaking your scripts into reusable functions makes them easier to test, maintain, and share.

### Function Structure Pattern

Follow a consistent structure for your functions:

```powershell
function Verb-Noun {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true, 
                   ValueFromPipeline = $true,
                   HelpMessage = "Description of parameter")]
        [ValidateNotNullOrEmpty()]
        [string]$RequiredParam,
        
        [Parameter(Mandatory = $false)]
        [string]$OptionalParam = "DefaultValue"
    )
    
    begin {
        # Initialize resources, connect to services
        Write-Verbose "Starting Verb-Noun operation"
    }
    
    process {
        try {
            # Main function logic
            Write-Verbose "Processing $RequiredParam"
            # ...
        }
        catch {
            Write-Error "Error in Verb-Noun: $_"
            throw
        }
    }
    
    end {
        # Clean up resources
        Write-Verbose "Completed Verb-Noun operation"
    }
}
```

### Creating Reusable Modules

Group related functions into modules for easier reuse:

```powershell
# Save as M365Management.psm1
function Connect-M365Services {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [pscredential]$Credential,
        
        [Parameter(Mandatory=$false)]
        [switch]$ExchangeOnline,
        
        [Parameter(Mandatory=$false)]
        [switch]$SharePointOnline,
        
        [Parameter(Mandatory=$false)]
        [switch]$Teams
    )
    
    # Connection logic for each service
    # ...
}

function Get-M365UserReport {
    # Report generation logic
    # ...
}

# Export functions
Export-ModuleMember -Function Connect-M365Services, Get-M365UserReport
```

## Secure Authentication

Security should be a top priority in your PowerShell scripts, especially when they interact with Microsoft 365 services.

### Modern Authentication

Always use modern authentication methods instead of basic authentication:

```powershell
# Connect to Exchange Online with modern auth
function Connect-ExchangeOnlineSecure {
    [CmdletBinding()]
    param()
    
    try {
        # Check for EXO V2 module
        if (!(Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
            Write-Error "Exchange Online Management module not found. Install using: Install-Module ExchangeOnlineManagement -Force"
            return $false
        }
        
        # Import module
        Import-Module ExchangeOnlineManagement
        
        # Connect using modern authentication
        Connect-ExchangeOnline -ShowProgress $true
        
        return $true
    }
    catch {
        Write-Error "Failed to connect to Exchange Online: $_"
        return $false
    }
}
```

### Handling Credentials Securely

Never hardcode credentials in your scripts:

```powershell
# Bad practice
$username = "admin@contoso.com"
$password = "PlainTextPassword" 
$secPassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($username, $secPassword)

# Better practice - retrieve from certificate
function Get-CertificateCredential {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$CertificateThumbprint,
        
        [Parameter(Mandatory = $true)]
        [string]$TenantId,
        
        [Parameter(Mandatory = $true)]
        [string]$ApplicationId
    )
    
    try {
        $certificate = Get-Item "Cert:\CurrentUser\My\$CertificateThumbprint"
        
        Connect-MgGraph -TenantId $TenantId -ClientId $ApplicationId -Certificate $certificate
        
        return $true
    }
    catch {
        Write-Error "Failed to authenticate using certificate: $_"
        return $false
    }
}
```

## Error Handling and Logging

Robust error handling and logging are essential for troubleshooting and monitoring your scripts.

### Structured Error Handling

Implement structured error handling in all your scripts:

```powershell
function Set-UserLicenses {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$UserPrincipalName,
        
        [Parameter(Mandatory = $true)]
        [string[]]$LicenseSkuIds
    )
    
    try {
        # Main logic
        Write-Verbose "Assigning licenses to $UserPrincipalName"
        # ...
    }
    catch [Microsoft.Open.AzureAD16.Client.ApiException] {
        # Handle Azure AD specific errors
        Write-Error "Azure AD error: $_"
        throw
    }
    catch [System.Net.WebException] {
        # Handle connectivity issues
        Write-Error "Network error: $_"
        throw
    }
    catch {
        # Handle other errors
        Write-Error "Unexpected error: $_"
        throw
    }
    finally {
        # Clean up code that always runs
        Write-Verbose "License operation completed."
    }
}
```

### Comprehensive Logging

Implement proper logging that captures important details:

```powershell
function Write-Log {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$Message,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet('Info','Warning','Error')]
        [string]$Level = 'Info',
        
        [Parameter(Mandatory = $false)]
        [string]$LogFilePath = "C:\Logs\M365Automation_$(Get-Date -Format 'yyyyMMdd').log"
    )
    
    # Create timestamp
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    
    # Format log entry
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Ensure log directory exists
    $logDir = Split-Path -Path $LogFilePath -Parent
    if (!(Test-Path -Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    }
    
    # Write to log file
    Add-Content -Path $LogFilePath -Value $logEntry
    
    # Output to console with color
    switch ($Level) {
        'Info'    { Write-Host $logEntry -ForegroundColor Cyan }
        'Warning' { Write-Host $logEntry -ForegroundColor Yellow }
        'Error'   { Write-Host $logEntry -ForegroundColor Red }
    }
}

# Usage
function Update-UserSettings {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string[]]$UserIds
    )
    
    Write-Log "Starting batch update for $($UserIds.Count) users"
    
    foreach ($userId in $UserIds) {
        try {
            # Update logic
            Write-Log "Processing user $userId" -Level 'Info'
        }
        catch {
            Write-Log "Failed to update user $userId: $_" -Level 'Error'
        }
    }
    
    Write-Log "Batch update completed"
}
```

## Performance Optimization

Optimizing script performance becomes crucial when working with large Microsoft 365 tenants.

### Batch Processing

Process items in batches to improve performance:

```powershell
function Set-BulkUserProperties {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$CsvFilePath,
        
        [Parameter(Mandatory = $false)]
        [int]$BatchSize = 50
    )
    
    # Import CSV
    $users = Import-Csv -Path $CsvFilePath
    $totalUsers = $users.Count
    $processedUsers = 0
    
    # Process in batches
    for ($i = 0; $i -lt $totalUsers; $i += $BatchSize) {
        $userBatch = $users | Select-Object -Skip $i -First $BatchSize
        
        # Process the batch
        $batchTasks = @()
        foreach ($user in $userBatch) {
            $batchTasks += Update-UserPropertiesAsync -User $user
        }
        
        # Wait for all batch operations to complete
        $results = Wait-Job -Job $batchTasks
        
        # Update progress
        $processedUsers += $userBatch.Count
        $percentComplete = [math]::Round(($processedUsers / $totalUsers) * 100, 2)
        Write-Progress -Activity "Updating User Properties" -Status "$processedUsers of $totalUsers users processed" -PercentComplete $percentComplete
    }
    
    Write-Progress -Activity "Updating User Properties" -Completed
}
```

### Parallel Processing

Use parallel processing for independent operations:

```powershell
function Get-AllSiteCollectionSizes {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $false)]
        [int]$ThrottleLimit = 5
    )
    
    # Connect to SharePoint Online
    Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive
    
    # Get all site collections
    $siteCollections = Get-PnPTenantSite
    
    # Process sites in parallel
    $siteCollections | ForEach-Object -ThrottleLimit $ThrottleLimit -Parallel {
        $site = $_
        
        # Connect to the specific site
        Connect-PnPOnline -Url $site.Url -Interactive
        
        # Get site size and other properties
        $siteData = [PSCustomObject]@{
            Url = $site.Url
            Title = $site.Title
            StorageUsageMB = [math]::Round($site.StorageUsageCurrent, 2)
            LastModified = $site.LastContentModifiedDate
        }
        
        # Output the result
        $siteData
    }
}
```

## Automating Microsoft 365 Security Tasks

Security tasks are one of the most common automation scenarios in Microsoft 365 environments.

### Creating a Conditional Access Policy

```powershell
function New-ConditionalAccessPolicy {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$PolicyName,
        
        [Parameter(Mandatory = $true)]
        [string[]]$TargetGroups,
        
        [Parameter(Mandatory = $true)]
        [string[]]$TargetApps,
        
        [Parameter(Mandatory = $false)]
        [switch]$RequireMFA
    )
    
    try {
        # Connect to Microsoft Graph (Authentication handled separately)
        
        # Create conditions
        $conditions = New-Object -TypeName Microsoft.Open.MSGraph.Model.ConditionalAccessConditionSet
        
        # Add users
        $conditions.Users = New-Object -TypeName Microsoft.Open.MSGraph.Model.ConditionalAccessUserCondition
        $conditions.Users.IncludeGroups = $TargetGroups
        
        # Add applications
        $conditions.Applications = New-Object -TypeName Microsoft.Open.MSGraph.Model.ConditionalAccessApplicationCondition
        $conditions.Applications.IncludeApplications = $TargetApps
        
        # Create grant controls
        $grantControls = New-Object -TypeName Microsoft.Open.MSGraph.Model.ConditionalAccessGrantControls
        $grantControls.Operator = "OR"
        
        if ($RequireMFA) {
            $grantControls.BuiltInControls = "Mfa"
        }
        
        # Create new policy
        New-AzureADMSConditionalAccessPolicy `
            -DisplayName $PolicyName `
            -State "Enabled" `
            -Conditions $conditions `
            -GrantControls $grantControls
        
        Write-Log "Created conditional access policy: $PolicyName" -Level 'Info'
    }
    catch {
        Write-Log "Failed to create conditional access policy: $_" -Level 'Error'
        throw
    }
}
```

### Security Report Generation

```powershell
function Get-SecurityComplianceReport {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $false)]
        [string]$OutputPath = "C:\Reports\SecurityCompliance_$(Get-Date -Format 'yyyyMMdd').csv"
    )
    
    try {
        # Get users without MFA
        $usersWithoutMFA = Get-UsersWithoutMFA
        
        # Get accounts with risky sign-ins
        $riskyAccounts = Get-RiskySignInAccounts
        
        # Get guest accounts
        $guestAccounts = Get-AzureADUser -Filter "userType eq 'Guest'"
        
        # Get admin accounts
        $adminAccounts = Get-AdminAccounts
        
        # Compile report
        $report = [PSCustomObject]@{
            ReportDate = Get-Date
            UsersWithoutMFA = $usersWithoutMFA.Count
            RiskyAccounts = $riskyAccounts.Count
            GuestAccounts = $guestAccounts.Count
            AdminAccounts = $adminAccounts.Count
            SecurityScore = Get-TenantSecureScore
            CompliancePercentage = Calculate-CompliancePercentage
        }
        
        # Export detailed findings
        $detailedReport = @()
        
        foreach ($user in $usersWithoutMFA) {
            $detailedReport += [PSCustomObject]@{
                UserPrincipalName = $user.UserPrincipalName
                DisplayName = $user.DisplayName
                Finding = "Missing MFA"
                RiskLevel = "High"
                RecommendedAction = "Enable MFA"
            }
        }
        
        # Add other findings
        # ...
        
        # Export to CSV
        $detailedReport | Export-Csv -Path $OutputPath -NoTypeInformation
        
        return $report
    }
    catch {
        Write-Log "Failed to generate security compliance report: $_" -Level 'Error'
        throw
    }
}
```

## Conclusion

PowerShell remains an essential tool for Microsoft 365 automation, providing powerful capabilities for managing and securing your environment. By following these best practices for modular design, secure authentication, error handling, and performance optimization, you can create more reliable and maintainable automation solutions.

In future articles, I'll dive deeper into specific Microsoft 365 automation scenarios, including Teams governance, Exchange Online management, and SharePoint site provisioning.

---

Do you have questions about PowerShell automation for Microsoft 365? [Contact me](mailto:ssmanji89@gmail.com) or share your thoughts in the comments below.
