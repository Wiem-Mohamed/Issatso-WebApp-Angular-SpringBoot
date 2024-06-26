import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import SharedModule from 'app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { EvenementFormService, EvenementFormGroup } from './evenement-form.service';
import { IEvenement } from '../evenement.model';
import { EvenementService } from '../service/evenement.service';
import { AlertError } from 'app/shared/alert/alert-error.model';
import { EventManager, EventWithContent } from 'app/core/util/event-manager.service';
import { DataUtils, FileLoadError } from 'app/core/util/data-util.service';
import { IPartenaire } from 'app/entities/partenaire/partenaire.model';
import { PartenaireService } from 'app/entities/partenaire/service/partenaire.service';

@Component({
  standalone: true,
  selector: 'jhi-evenement-update',
  templateUrl: './evenement-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class EvenementUpdateComponent implements OnInit {
  isSaving = false;
  evenement: IEvenement | null = null;

  partenairesSharedCollection: IPartenaire[] = [];

  editForm: EvenementFormGroup = this.evenementFormService.createEvenementFormGroup();

  constructor(
    protected dataUtils: DataUtils,
    protected eventManager: EventManager,
    protected evenementService: EvenementService,
    protected evenementFormService: EvenementFormService,
    protected partenaireService: PartenaireService,
    protected activatedRoute: ActivatedRoute
  ) {}

  comparePartenaire = (o1: IPartenaire | null, o2: IPartenaire | null): boolean => this.partenaireService.comparePartenaire(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ evenement }) => {
      this.evenement = evenement;
      if (evenement) {
        this.updateForm(evenement);
      }

      this.loadRelationshipsOptions();
    });
  }

  byteSize(base64String: string): string {
    return this.dataUtils.byteSize(base64String);
  }

  openFile(base64String: string, contentType: string | null | undefined): void {
    this.dataUtils.openFile(base64String, contentType);
  }

  setFileData(event: Event, field: string, isImage: boolean): void {
    this.dataUtils.loadFileToForm(event, this.editForm, field, isImage).subscribe({
      error: (err: FileLoadError) =>
        this.eventManager.broadcast(new EventWithContent<AlertError>('issatsoApp.error', { ...err, key: 'error.file.' + err.key })),
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const evenement = this.evenementFormService.getEvenement(this.editForm);
    if (evenement.id !== null) {
      this.subscribeToSaveResponse(this.evenementService.update(evenement));
    } else {
      this.subscribeToSaveResponse(this.evenementService.create(evenement));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IEvenement>>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving = false;
  }

  protected updateForm(evenement: IEvenement): void {
    this.evenement = evenement;
    this.evenementFormService.resetForm(this.editForm, evenement);

    this.partenairesSharedCollection = this.partenaireService.addPartenaireToCollectionIfMissing<IPartenaire>(
      this.partenairesSharedCollection,
      ...(evenement.partenaires ?? [])
    );
  }

  protected loadRelationshipsOptions(): void {
    this.partenaireService
      .query()
      .pipe(map((res: HttpResponse<IPartenaire[]>) => res.body ?? []))
      .pipe(
        map((partenaires: IPartenaire[]) =>
          this.partenaireService.addPartenaireToCollectionIfMissing<IPartenaire>(partenaires, ...(this.evenement?.partenaires ?? []))
        )
      )
      .subscribe((partenaires: IPartenaire[]) => (this.partenairesSharedCollection = partenaires));
  }
}
