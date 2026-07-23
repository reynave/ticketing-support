import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';

export interface AddContactModalResult {
  response: any;
  error: string; 
}

interface AddContactFormModel {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-add-contact-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-contact-modal.component.html',
})
export class AddContactModalComponent implements OnInit {
  @Input() project: any = null;
  @Input() contacts: any[] = [];
  loadingOptions: boolean = true;
  listContacts: any[] = [];
  formModel: AddContactFormModel = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  };

  saving = false;

  private readonly apiService = inject(ApiService);

  constructor(public activeModal: NgbActiveModal) {}
  ngOnInit(): void {
    console.log(
      'AddContactModalComponent initialized with project:',
      this.project,
    );
    this.loadOptions();
  }

  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const [clientResponse] = await Promise.all([
        firstValueFrom(
          this.apiService.get(`/client/${this.project.clientId}/project/${this.project.id}`),
        ),
      ]);
      this.listContacts = Array.isArray(clientResponse?.data)
        ? clientResponse.data
        : [];

      // tolong tambain this.listContact checkbox = false;
      for (const contact of this.listContacts) {
        contact['checkbox'] = false;
      }
    } catch {
      this.listContacts = [];
    } finally {
      this.loadingOptions = false;
    }
  }

  addContact(form: NgForm): void {
    this.saving = true;
    const payload = {
        userAuthLevelId : 0, // Assuming 0 is the userAuthLevelId for contacts
      userTypeId : 2, // Assuming 2 is the userTypeId for contacts
      password: 'defaultPassword', // You might want to handle password differently  
      firstName: this.formModel.firstName.trim(),
      lastName: this.formModel.lastName.trim(),
      email: this.formModel.email.trim(),
      phone: this.formModel.phone.trim(),
      projectId: this.project?.id,
      clientId: this.project?.clientId,
    };
    console.log('Form submitted:', payload);

     const request$ = this.apiService.post(`/user`, payload);

    request$.subscribe({
      next: (response) => {
        this.saving = false;  
        this.loadOptions();
      },
      error: (error) => {
        this.saving = false;
        alert('Error adding contact: Email already exists or ' + (error?.message || 'Unknown error'));
      },
    });
  }

  addContactFromList(): void {
    // if (this.saving) {
    //   return;
    // }

    this.saving = true;
   

    const payload = {
        projectId: this.project?.id,
        clientId: this.project?.clientId,
        contacts: this.listContacts.filter(c => c.checkbox)
    };
     console.log('Selected contacts:', payload);
     
    const request$ = this.apiService.post(`/project/contact`, payload);

    request$.subscribe({
      next: (response) => {
        this.saving = false;   
        

        this.activeModal.close({
            response : response,
            error : false,
        });
      },
      error: (error) => {
        this.saving = false;
        alert('Error : ' + (error?.message || 'Unknown error'));
      },
    });


    // this.activeModal.close({
    //   firstName: this.formModel.firstName.trim(),
    //   lastName: this.formModel.lastName.trim(),
    //   email: this.formModel.email.trim(),
    //   phone: this.formModel.phone.trim(),
    // } as AddContactModalResult);
  }

 
}
